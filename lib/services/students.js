// Student profile, resume and project management.
import { many, one, query } from '../db.js';
import { AppError } from '../errors.js';
import { refreshProjectEmbedding, refreshStudentEmbedding, safeIndex } from './indexing.js';

export async function getStudentProfile(studentId) {
  return one(
    `SELECT s.student_id, u.full_name, u.email, u.verification_status, u.created_at,
            s.roll_number, s.department_id, d.code AS department_code, d.name AS department_name,
            s.graduation_year, s.cgpa, s.phone, s.headline, s.skills,
            s.resume_text, s.resume_filename, s.resume_mime, s.resume_updated_at,
            (s.resume_file IS NOT NULL) AS has_resume_file,
            s.placement_status, s.placed_at, s.placed_offer_id,
            se.updated_at AS embedding_updated_at, se.model AS embedding_model, se.chunk_count
       FROM students s
       JOIN users u        ON u.user_id = s.student_id
       JOIN departments d  ON d.department_id = s.department_id
       LEFT JOIN student_embeddings se ON se.student_id = s.student_id
      WHERE s.student_id = $1`,
    [studentId],
  );
}

export async function listProjects(studentId) {
  return many(
    `SELECT p.project_id, p.title, p.summary, p.tech_stack, p.project_url, p.created_at,
            (pe.project_id IS NOT NULL) AS indexed
       FROM student_projects p
       LEFT JOIN project_embeddings pe ON pe.project_id = p.project_id
      WHERE p.student_id = $1
      ORDER BY p.created_at DESC`,
    [studentId],
  );
}

/** Returns { indexed: boolean } — false when the embedding model could not run. */
export async function updateStudentProfile(studentId, { phone, headline, skills }) {
  await query(
    `UPDATE students SET phone = $2, headline = $3, skills = $4 WHERE student_id = $1`,
    [studentId, phone, headline, skills],
  );
  const indexed = await safeIndex(`student ${studentId}`, () => refreshStudentEmbedding(studentId));
  return { indexed };
}

export async function saveResume(studentId, { text, filename = null, mime = null, buffer = null }) {
  await query(
    `UPDATE students
        SET resume_text = $2,
            resume_filename = $3,
            resume_mime = $4,
            resume_file = $5,
            resume_updated_at = now()
      WHERE student_id = $1`,
    [studentId, text, filename, mime, buffer],
  );
  const indexed = await safeIndex(`student ${studentId}`, () => refreshStudentEmbedding(studentId));
  return { indexed };
}

export async function addProject(studentId, { title, summary, techStack, projectUrl }) {
  const project = await one(
    `INSERT INTO student_projects (student_id, title, summary, tech_stack, project_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING project_id`,
    [studentId, title, summary, techStack, projectUrl],
  );
  const indexed =
    (await safeIndex(`project ${project.project_id}`, () => refreshProjectEmbedding(project.project_id))) &&
    (await safeIndex(`student ${studentId}`, () => refreshStudentEmbedding(studentId)));
  return { projectId: project.project_id, indexed };
}

export async function deleteProject(studentId, projectId) {
  const deleted = await one(
    'DELETE FROM student_projects WHERE project_id = $1 AND student_id = $2 RETURNING project_id',
    [projectId, studentId],
  );
  if (!deleted) throw new AppError('Project not found.');
  const indexed = await safeIndex(`student ${studentId}`, () => refreshStudentEmbedding(studentId));
  return { indexed };
}

/** Raw resume file for download, with an access check. */
export async function getResumeFileForViewer(studentId, viewer) {
  const allowed =
    viewer.role === 'ADMIN' ||
    (viewer.role === 'STUDENT' && viewer.user_id === studentId) ||
    (viewer.role === 'RECRUITER' && viewer.verification_status === 'VERIFIED');
  if (!allowed) return null;
  return one(
    `SELECT s.resume_file, s.resume_filename, s.resume_mime, s.resume_text, u.full_name
       FROM students s JOIN users u ON u.user_id = s.student_id
      WHERE s.student_id = $1`,
    [studentId],
  );
}
