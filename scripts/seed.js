// Loads demo data through the same service layer the web app uses, so every
// trigger, constraint and transaction runs exactly as it would in production.
//   npm run db:seed        (after npm run db:setup)
import 'dotenv/config';
import { closePool, many, one, query } from '../lib/db.js';
import { embeddingModelName } from '../lib/embeddings.js';
import { createAdmin, registerRecruiter, registerStudent } from '../lib/services/accounts.js';
import { reviewJob } from '../lib/services/jobs.js';
import { rebuildAllEmbeddings } from '../lib/services/indexing.js';
import { applyToJob, recruiterSetApplicationStatus } from '../lib/services/applications.js';
import { recordInterviewOutcome, scheduleInterview } from '../lib/services/interviews.js';
import { acceptOffer, issueOffer } from '../lib/services/offers.js';
import { refreshPlacementStats } from '../lib/services/stats.js';
import { JOBS, RECRUITERS, STUDENTS } from './seed-data.js';

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Password@123';
const GRADUATION_YEAR = Number(process.env.SEED_GRADUATION_YEAR || new Date().getFullYear() + 1);

/** A timestamp `days` from now at hh:mm India time (UTC+05:30). */
function istAt(days, hour, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour - 5, minute - 30, 0, 0);
  return d.toISOString();
}

function dateIn(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const existing = await one('SELECT count(*) AS n FROM users');
  if (existing.n > 0) {
    console.error('The database already contains users. Run `npm run db:reset` to wipe and re-seed.');
    process.exitCode = 1;
    return;
  }
  const departments = Object.fromEntries(
    (await many('SELECT department_id, code FROM departments')).map((d) => [d.code, d.department_id]),
  );
  if (!departments.CSE) throw new Error('Departments missing — run `npm run db:setup` first.');

  // ------------------------------------------------------------ users
  const adminEmail = process.env.ADMIN_EMAIL || 'placement.officer@university.edu';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
  const admin = await createAdmin({ email: adminEmail, password: adminPassword, fullName: 'Dr. Kavita Sinha (Placement Officer)' });
  console.log(`✓ admin            ${admin.email}`);

  const recruiterIds = {};
  for (const r of RECRUITERS) {
    const user = await registerRecruiter({
      ...r,
      password: DEMO_PASSWORD,
      verificationStatus: r.verified ? 'VERIFIED' : 'PENDING',
    });
    recruiterIds[r.key] = user.user_id;
  }
  await query('UPDATE users SET verified_by = $1, verified_at = now() WHERE verification_status = $2', [
    admin.user_id,
    'VERIFIED',
  ]);
  console.log(`✓ recruiters       ${RECRUITERS.length}`);

  const studentIds = {};
  for (const s of STUDENTS) {
    const user = await registerStudent({
      fullName: s.fullName,
      email: s.email,
      password: DEMO_PASSWORD,
      rollNumber: s.roll,
      departmentId: departments[s.dept],
      graduationYear: GRADUATION_YEAR,
      cgpa: s.cgpa,
      headline: s.headline,
      skills: s.skills,
      verificationStatus: s.verified === false ? 'PENDING' : 'VERIFIED',
    });
    studentIds[s.key] = user.user_id;
    await query('UPDATE students SET resume_text = $2, resume_updated_at = now() WHERE student_id = $1', [
      user.user_id,
      s.resume,
    ]);
    for (const p of s.projects) {
      await query(
        'INSERT INTO student_projects (student_id, title, summary, tech_stack) VALUES ($1, $2, $3, $4)',
        [user.user_id, p.title, p.summary, p.techStack],
      );
    }
  }
  await query(
    `UPDATE users SET verified_by = $1, verified_at = now()
      WHERE verification_status = 'VERIFIED' AND verified_by IS NULL AND role = 'STUDENT'`,
    [admin.user_id],
  );
  console.log(`✓ students         ${STUDENTS.length} (batch of ${GRADUATION_YEAR})`);

  // ------------------------------------------------------------ jobs
  const jobIds = {};
  for (const j of JOBS) {
    const row = await one(
      `INSERT INTO job_postings (recruiter_id, title, description, requirements, required_skills, job_type,
                                 location, ctc_lpa, min_cgpa, max_applications, hiring_quota, application_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING job_id`,
      [
        recruiterIds[j.recruiter],
        j.title,
        j.description,
        j.requirements,
        j.requiredSkills,
        j.jobType,
        j.location,
        j.ctcLpa,
        j.minCgpa,
        j.maxApplications,
        j.hiringQuota,
        dateIn(21),
      ],
    );
    jobIds[j.key] = row.job_id;
    for (const code of j.departments) {
      await query('INSERT INTO job_eligible_departments (job_id, department_id) VALUES ($1, $2)', [
        row.job_id,
        departments[code],
      ]);
    }
    if (j.status === 'OPEN') await reviewJob(admin.user_id, row.job_id, 'APPROVE', 'Approved for campus drive');
  }
  console.log(`✓ job postings     ${JOBS.length} (${JOBS.filter((j) => j.status !== 'OPEN').length} awaiting approval)`);

  // ------------------------------------------------------------ vector index
  console.log(`… embedding profiles and jobs with ${embeddingModelName()} (first run downloads the model)`);
  try {
    const counts = await rebuildAllEmbeddings();
    console.log(`✓ vector index     ${counts.students} students, ${counts.projects} projects, ${counts.jobs} jobs`);
  } catch (err) {
    console.warn(`! embeddings skipped: ${err.message}`);
    console.warn('  The portal still works; run `npm run embeddings:rebuild` once the model can be downloaded.');
  }

  // ------------------------------------------------------------ hiring pipeline
  const S = studentIds;
  const R = recruiterIds;
  const J = jobIds;
  const apps = {};
  const apply = async (student, job, note = null) => {
    const { applicationId } = await applyToJob(S[student], J[job], note);
    apps[`${student}:${job}`] = applicationId;
    return applicationId;
  };

  await apply('aarav', 'backend', 'I have built Spring Boot services with PostgreSQL in my internship and projects.');
  await apply('rohan', 'backend');
  await apply('meera', 'backend');
  await apply('kabir', 'frontend', 'My portfolio includes a Next.js dashboard used by 400 students.');
  await apply('arjun', 'frontend');
  await apply('rohan', 'frontend');
  await apply('meera', 'sre');
  await apply('aarav', 'sre');
  await apply('tanvi', 'sre'); // 3rd application -> trigger auto-closes the SRE posting
  await apply('diya', 'datasci', 'My loan-default project is very close to this role.');
  await apply('sneha', 'datasci');
  await apply('sneha', 'analyst');
  await apply('diya', 'analyst');
  await apply('nikhil', 'analyst');
  await apply('ishaan', 'firmware');
  await apply('pooja', 'firmware');
  await apply('tanvi', 'firmware');
  await apply('riya', 'structures');
  await apply('karan', 'structures');
  await apply('siddharth', 'structures');
  await apply('aditya', 'power');
  console.log(`✓ applications     ${Object.keys(apps).length}`);

  const shortlist = (rec, key) => recruiterSetApplicationStatus(R[rec], apps[key], 'SHORTLISTED');
  const interview = (rec, key, roundName, when, extra = {}) =>
    scheduleInterview(R[rec], apps[key], {
      roundName,
      scheduledAt: when,
      durationMinutes: 45,
      mode: 'ONLINE',
      locationOrLink: 'https://meet.example.com/placement-drive',
      ...extra,
    });
  const completeInterview = async (rec, interviewId, feedback, daysAgo) => {
    await recordInterviewOutcome(R[rec], interviewId, { result: 'PASSED', feedback });
    // move the completed round into the past so the timeline reads naturally
    await query(`UPDATE interviews SET scheduled_at = now() - make_interval(days => $2) WHERE interview_id = $1`, [
      interviewId,
      daysAgo,
    ]);
  };
  const offer = (rec, key, ctcLpa, notes) =>
    issueOffer(R[rec], apps[key], { ctcLpa, joiningDate: dateIn(240), respondBy: dateIn(7), notes });

  // NovaByte — backend: Aarav hired, Rohan interviewing, Meera shortlisted
  await shortlist('novabyte', 'aarav:backend');
  await shortlist('novabyte', 'rohan:backend');
  await shortlist('novabyte', 'meera:backend');
  const aaravRound = await interview('novabyte', 'aarav:backend', 'Technical interview', istAt(1, 10));
  await completeInterview('novabyte', aaravRound.interviewId, 'Excellent system design discussion.', 3);
  const aaravOffer = await offer('novabyte', 'aarav:backend', 15, 'Includes ₹1 L joining bonus.');
  await acceptOffer(S.aarav, aaravOffer.offerId); // auto-rejects Aarav's SRE application
  await interview('novabyte', 'rohan:backend', 'Technical interview', istAt(2, 11));

  // NovaByte — frontend: Kabir interviewing, Arjun rejected
  await shortlist('novabyte', 'kabir:frontend');
  await interview('novabyte', 'kabir:frontend', 'Frontend coding round', istAt(3, 15), { durationMinutes: 60 });
  await recruiterSetApplicationStatus(R.novabyte, apps['arjun:frontend'], 'REJECTED', 'Profile does not match the React focus');

  // Finlytics — data scientist: Diya hired (quota 1 -> trigger closes the job, rejects Sneha)
  await shortlist('finlytics', 'diya:datasci');
  const diyaRound = await interview('finlytics', 'diya:datasci', 'Case-study interview', istAt(1, 14));
  await completeInterview('finlytics', diyaRound.interviewId, 'Strong statistics fundamentals.', 2);
  const diyaOffer = await offer('finlytics', 'diya:datasci', 17, 'Mumbai office, hybrid.');
  await acceptOffer(S.diya, diyaOffer.offerId); // also auto-rejects Diya's analyst application

  // Finlytics — analyst: Sneha holds a pending offer (demo the accept transaction as Sneha)
  await shortlist('finlytics', 'sneha:analyst');
  await offer('finlytics', 'sneha:analyst', 9.5, 'Please confirm within a week.');

  // Voltaris — firmware: Ishaan hired, Pooja shortlisted
  await shortlist('voltaris', 'ishaan:firmware');
  const ishaanRound = await interview('voltaris', 'ishaan:firmware', 'Embedded systems interview', istAt(1, 16));
  await completeInterview('voltaris', ishaanRound.interviewId, 'Debugged the I2C exercise quickly.', 2);
  const ishaanOffer = await offer('voltaris', 'ishaan:firmware', 12, null);
  await acceptOffer(S.ishaan, ishaanOffer.offerId);
  await shortlist('voltaris', 'pooja:firmware');

  // UrbanGrid — structures: Riya hired; power: Aditya interviewing
  await shortlist('urbangrid', 'riya:structures');
  const riyaOffer = await offer('urbangrid', 'riya:structures', 7.5, 'Site allowance extra.');
  await acceptOffer(S.riya, riyaOffer.offerId);
  await interview('urbangrid', 'aditya:power', 'Technical interview', istAt(4, 11), { mode: 'ONSITE', locationOrLink: 'Placement Cell, Room 204' });

  console.log('✓ hiring pipeline  interviews, offers and 4 accepted offers');

  // ------------------------------------------------------------ statistics
  await refreshPlacementStats(null);
  await refreshPlacementStats(GRADUATION_YEAR);
  const summary = await one('SELECT * FROM fn_overall_placement_summary(NULL)');
  console.log(
    `✓ statistics       ${summary.placed_students}/${summary.total_students} placed (${summary.placement_percentage}%), avg CTC ₹${summary.average_ctc} LPA`,
  );

  console.log('\nDemo logins (password for students/recruiters = SEED_DEMO_PASSWORD):');
  console.log(`  admin      ${adminEmail}  (password = ADMIN_PASSWORD)`);
  console.log('  recruiter  hiring@novabyte.example.com');
  console.log('  student    sneha.reddy@student.university.edu   (pending offer)');
  console.log('  student    rohan.gupta@student.university.edu   (interview scheduled)');
  console.log('  student    aarav.sharma@student.university.edu  (placed)');
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err.message);
    if (err.detail) console.error(err.detail);
    process.exitCode = 1;
  })
  .finally(() => closePool());
