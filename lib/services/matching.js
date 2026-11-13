// AI matchmaking — vector similarity search with pgvector.
//
//   cosine distance   : a <=> b      (0 = identical direction, 2 = opposite)
//   cosine similarity : 1 - (a <=> b)
//
// Queries of the form  ORDER BY embedding <=> $target LIMIT k  are served by
// the HNSW indexes created in db/01_schema.sql.
import { many, one } from '../db.js';
import { embedQuery, toSqlVector } from '../embeddings.js';

const ELIGIBILITY_SQL = `
  (s.cgpa IS NOT NULL AND s.cgpa >= j.min_cgpa) AS cgpa_ok,
  (NOT EXISTS (SELECT 1 FROM job_eligible_departments jd WHERE jd.job_id = j.job_id)
     OR EXISTS (SELECT 1 FROM job_eligible_departments jd
                 WHERE jd.job_id = j.job_id AND jd.department_id = s.department_id)) AS department_ok,
  COALESCE((SELECT array_agg(d2.code ORDER BY d2.code)
              FROM job_eligible_departments jd
              JOIN departments d2 ON d2.department_id = jd.department_id
             WHERE jd.job_id = j.job_id), '{}') AS eligible_departments`;

/**
 * Open jobs for a student ranked by similarity.
 *   - default: ranked against the student's own profile embedding
 *   - with `searchText`: ranked against the embedded search query (semantic search)
 * Jobs without an embedding are listed after ranked ones.
 */
export async function matchJobsForStudent(studentId, { searchText = null, limit = 50 } = {}) {
  const queryVector = searchText ? toSqlVector(await embedQuery(searchText)) : null;
  return many(
    `WITH target AS (
        SELECT CASE WHEN $2::text IS NOT NULL THEN ($2::text)::vector
                    ELSE (SELECT embedding FROM student_embeddings WHERE student_id = $1) END AS embedding
     )
     SELECT j.job_id, j.title, j.job_type, j.location, j.ctc_lpa, j.min_cgpa, j.application_deadline,
            j.required_skills, j.status, j.max_applications, j.created_at,
            r.company_name,
            CASE WHEN je.embedding IS NOT NULL AND t.embedding IS NOT NULL
                 THEN 1 - (je.embedding <=> t.embedding) END AS match_score,
            a.application_id, a.status AS application_status,
            ${ELIGIBILITY_SQL}
       FROM job_postings j
       JOIN recruiters r            ON r.recruiter_id = j.recruiter_id
       JOIN students s              ON s.student_id = $1
       CROSS JOIN target t
       LEFT JOIN job_embeddings je  ON je.job_id = j.job_id
       LEFT JOIN applications a     ON a.job_id = j.job_id AND a.student_id = $1
      WHERE j.status = 'OPEN'
        AND (j.application_deadline IS NULL OR j.application_deadline >= CURRENT_DATE)
      ORDER BY (je.embedding <=> t.embedding) ASC NULLS LAST, j.created_at DESC
      LIMIT $3`,
    [studentId, queryVector, limit],
  );
}

/** Similarity between one student and one job (null if either is not indexed). */
export async function studentJobSimilarity(studentId, jobId, client = null) {
  const sql = `SELECT 1 - (se.embedding <=> je.embedding) AS score
                 FROM student_embeddings se, job_embeddings je
                WHERE se.student_id = $1 AND je.job_id = $2`;
  const row = client ? (await client.query(sql, [studentId, jobId])).rows[0] : await one(sql, [studentId, jobId]);
  return row ? Number(row.score) : null;
}

/**
 * Applicants of a job ranked by live cosine similarity between the
 * applicant's profile vector and the job vector, plus the single project
 * of each applicant that best matches the job (LATERAL top-1 vector query).
 */
export async function rankApplicantsForJob(jobId) {
  return many(
    `SELECT a.application_id, a.status, a.applied_at, a.cover_note, a.match_score AS score_at_apply,
            s.student_id, u.full_name, u.email, s.roll_number, s.cgpa, s.graduation_year,
            s.skills, s.headline, s.placement_status, d.code AS department_code,
            (s.resume_text IS NOT NULL) AS has_resume,
            CASE WHEN se.embedding IS NOT NULL AND je.embedding IS NOT NULL
                 THEN 1 - (se.embedding <=> je.embedding) END AS match_score,
            bp.title AS best_project_title, bp.similarity AS best_project_score,
            o.offer_id, o.status AS offer_status, o.ctc_lpa AS offer_ctc_lpa, o.respond_by,
            (SELECT COALESCE(max(i.round_number), 0) FROM interviews i
              WHERE i.application_id = a.application_id) AS rounds_scheduled
       FROM applications a
       JOIN students s     ON s.student_id = a.student_id
       JOIN users u        ON u.user_id = s.student_id
       JOIN departments d  ON d.department_id = s.department_id
       LEFT JOIN student_embeddings se ON se.student_id = s.student_id
       LEFT JOIN job_embeddings je     ON je.job_id = a.job_id
       LEFT JOIN LATERAL (
            SELECT p.title, 1 - (pe.embedding <=> je.embedding) AS similarity
              FROM student_projects p
              JOIN project_embeddings pe ON pe.project_id = p.project_id
             WHERE p.student_id = s.student_id
               AND je.embedding IS NOT NULL
             ORDER BY pe.embedding <=> je.embedding
             LIMIT 1
       ) bp ON true
       LEFT JOIN offers o ON o.application_id = a.application_id
      WHERE a.job_id = $1
      ORDER BY match_score DESC NULLS LAST, a.applied_at ASC`,
    [jobId],
  );
}

/**
 * Talent discovery: eligible, verified, unplaced students who have NOT
 * applied yet, nearest to the job vector (approximate k-NN via HNSW).
 */
export async function discoverCandidatesForJob(jobId, limit = 15) {
  return many(
    `WITH target AS (SELECT embedding FROM job_embeddings WHERE job_id = $1),
          job    AS (SELECT * FROM job_postings WHERE job_id = $1)
     SELECT s.student_id, u.full_name, s.roll_number, s.cgpa, s.graduation_year, s.skills, s.headline,
            d.code AS department_code, (s.resume_text IS NOT NULL) AS has_resume,
            1 - (se.embedding <=> t.embedding) AS match_score
       FROM student_embeddings se
       CROSS JOIN target t
       CROSS JOIN job j
       JOIN students s    ON s.student_id = se.student_id
       JOIN users u       ON u.user_id = s.student_id
       JOIN departments d ON d.department_id = s.department_id
      WHERE u.verification_status = 'VERIFIED'
        AND s.placement_status = 'UNPLACED'
        AND s.cgpa >= j.min_cgpa
        AND (NOT EXISTS (SELECT 1 FROM job_eligible_departments jd WHERE jd.job_id = j.job_id)
             OR EXISTS (SELECT 1 FROM job_eligible_departments jd
                         WHERE jd.job_id = j.job_id AND jd.department_id = s.department_id))
        AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id = j.job_id AND a.student_id = s.student_id)
      ORDER BY se.embedding <=> t.embedding
      LIMIT $2`,
    [jobId, limit],
  );
}

/**
 * Free-text semantic talent search for recruiters
 * ("backend engineer who has built REST APIs with PostgreSQL").
 */
export async function semanticTalentSearch(searchText, { departmentId = null, minCgpa = null, onlyUnplaced = true, limit = 25 } = {}) {
  const vector = toSqlVector(await embedQuery(searchText));
  return many(
    `SELECT s.student_id, u.full_name, s.roll_number, s.cgpa, s.graduation_year, s.skills, s.headline,
            s.placement_status, d.code AS department_code, (s.resume_text IS NOT NULL) AS has_resume,
            1 - (se.embedding <=> $1::vector) AS match_score,
            bp.title AS best_project_title, bp.similarity AS best_project_score
       FROM student_embeddings se
       JOIN students s    ON s.student_id = se.student_id
       JOIN users u       ON u.user_id = s.student_id
       JOIN departments d ON d.department_id = s.department_id
       LEFT JOIN LATERAL (
            SELECT p.title, 1 - (pe.embedding <=> $1::vector) AS similarity
              FROM student_projects p
              JOIN project_embeddings pe ON pe.project_id = p.project_id
             WHERE p.student_id = s.student_id
             ORDER BY pe.embedding <=> $1::vector
             LIMIT 1
       ) bp ON true
      WHERE u.verification_status = 'VERIFIED'
        AND ($2::int IS NULL OR s.department_id = $2)
        AND ($3::numeric IS NULL OR s.cgpa >= $3)
        AND (NOT $4::boolean OR s.placement_status = 'UNPLACED')
      ORDER BY se.embedding <=> $1::vector
      LIMIT $5`,
    [vector, departmentId, minCgpa, onlyUnplaced, limit],
  );
}
