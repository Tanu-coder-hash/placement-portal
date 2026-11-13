// Registration, authentication and verification of user accounts.
import bcrypt from 'bcryptjs';
import { many, one, query, withTransaction } from '../db.js';
import { AppError } from '../errors.js';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function listDepartments() {
  return many('SELECT department_id, code, name FROM departments ORDER BY name');
}

/** Creates users + students rows atomically. */
export async function registerStudent(input) {
  const passwordHash = await hashPassword(input.password);
  return withTransaction(async (client) => {
    const {
      rows: [user],
    } = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, verification_status)
       VALUES ($1, $2, $3, 'STUDENT', $4)
       RETURNING user_id, email, full_name, role, verification_status`,
      [input.email, passwordHash, input.fullName, input.verificationStatus || 'PENDING'],
    );
    await client.query(
      `INSERT INTO students (student_id, roll_number, department_id, graduation_year, cgpa, phone, headline, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.user_id,
        input.rollNumber.toUpperCase(),
        input.departmentId,
        input.graduationYear,
        input.cgpa,
        input.phone || null,
        input.headline || null,
        input.skills || [],
      ],
    );
    return user;
  });
}

/** Creates users + recruiters rows atomically. */
export async function registerRecruiter(input) {
  const passwordHash = await hashPassword(input.password);
  return withTransaction(async (client) => {
    const {
      rows: [user],
    } = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, verification_status)
       VALUES ($1, $2, $3, 'RECRUITER', $4)
       RETURNING user_id, email, full_name, role, verification_status`,
      [input.email, passwordHash, input.fullName, input.verificationStatus || 'PENDING'],
    );
    await client.query(
      `INSERT INTO recruiters (recruiter_id, company_name, designation, company_website, phone, company_description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.user_id,
        input.companyName,
        input.designation || null,
        input.companyWebsite || null,
        input.phone || null,
        input.companyDescription || null,
      ],
    );
    return user;
  });
}

export async function createAdmin({ email, password, fullName }) {
  const passwordHash = await hashPassword(password);
  return one(
    `INSERT INTO users (email, password_hash, full_name, role, verification_status)
     VALUES ($1, $2, $3, 'ADMIN', 'VERIFIED')
     ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING user_id, email, full_name, role`,
    [email.toLowerCase(), passwordHash, fullName],
  );
}

export async function authenticate(email, password) {
  const user = await one(
    `SELECT user_id, email, full_name, role, verification_status, password_hash
       FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  // Compare against a dummy hash when the user does not exist (uniform timing).
  const hash = user?.password_hash || '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid) throw new AppError('Invalid email or password.');
  if (user.verification_status === 'REJECTED') {
    throw new AppError('Your registration was rejected by the placement office. Please contact them for details.');
  }
  await query('UPDATE users SET last_login_at = now() WHERE user_id = $1', [user.user_id]);
  delete user.password_hash;
  return user;
}

// ------------------------------------------------------------ admin: verification
export async function listUsersForVerification({ status = 'PENDING', role = null } = {}) {
  return many(
    `SELECT u.user_id, u.email, u.full_name, u.role, u.verification_status, u.created_at, u.verified_at,
            s.roll_number, s.graduation_year, s.cgpa, d.code AS department_code,
            (s.resume_text IS NOT NULL) AS has_resume,
            r.company_name, r.designation, r.company_website
       FROM users u
       LEFT JOIN students s    ON s.student_id = u.user_id
       LEFT JOIN departments d ON d.department_id = s.department_id
       LEFT JOIN recruiters r  ON r.recruiter_id = u.user_id
      WHERE u.role <> 'ADMIN'
        AND ($1::verification_status IS NULL OR u.verification_status = $1)
        AND ($2::user_role IS NULL OR u.role = $2)
      ORDER BY u.created_at DESC
      LIMIT 300`,
    [status, role],
  );
}

export async function setVerificationStatus(adminId, userId, status) {
  if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) throw new AppError('Invalid verification status.');
  const updated = await one(
    `UPDATE users
        SET verification_status = $2::verification_status,
            verified_by = CASE WHEN $2::verification_status = 'PENDING' THEN NULL ELSE $3::int END,
            verified_at = CASE WHEN $2::verification_status = 'PENDING' THEN NULL ELSE now() END
      WHERE user_id = $1 AND role <> 'ADMIN'
      RETURNING user_id`,
    [userId, status, adminId],
  );
  if (!updated) throw new AppError('User not found.');
}
