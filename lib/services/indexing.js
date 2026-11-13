// Keeps the vector store (student / project / job embeddings) in sync with
// the relational data. Called after every profile, resume, project or job change.
import { many, one, query } from '../db.js';
import { embedDocument, embeddingModelName, toSqlVector } from '../embeddings.js';

// ------------------------------------------------------------ document builders
export function studentSegments(student, projects = []) {
  const summary = [
    student.headline,
    student.skills?.length ? `Skills: ${student.skills.join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return [
    { text: summary, weight: 2 },
    ...projects.map((p) => ({ text: projectText(p), weight: 1.5 })),
    { text: student.resume_text, weight: 1 },
  ];
}

export function projectText(project) {
  return [
    `Project: ${project.title}.`,
    project.summary,
    project.tech_stack?.length ? `Technologies: ${project.tech_stack.join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export function jobSegments(job) {
  return [
    {
      text: `${job.title}. ${job.required_skills?.length ? `Required skills: ${job.required_skills.join(', ')}.` : ''}`,
      weight: 2,
    },
    { text: job.requirements, weight: 1.5 },
    { text: job.description, weight: 1 },
  ];
}

// ------------------------------------------------------------ refreshers
export async function refreshStudentEmbedding(studentId) {
  const student = await one(
    'SELECT student_id, headline, skills, resume_text FROM students WHERE student_id = $1',
    [studentId],
  );
  if (!student) return null;
  const projects = await many(
    'SELECT title, summary, tech_stack FROM student_projects WHERE student_id = $1 ORDER BY project_id',
    [studentId],
  );

  const doc = await embedDocument(studentSegments(student, projects));
  if (!doc) {
    await query('DELETE FROM student_embeddings WHERE student_id = $1', [studentId]);
    return null;
  }
  await query(
    `INSERT INTO student_embeddings (student_id, embedding, model, chunk_count, source_chars, updated_at)
     VALUES ($1, $2::vector, $3, $4, $5, now())
     ON CONFLICT (student_id) DO UPDATE
        SET embedding = EXCLUDED.embedding, model = EXCLUDED.model,
            chunk_count = EXCLUDED.chunk_count, source_chars = EXCLUDED.source_chars,
            updated_at = now()`,
    [studentId, toSqlVector(doc.vector), embeddingModelName(), doc.chunkCount, doc.sourceChars],
  );
  return doc;
}

export async function refreshProjectEmbedding(projectId) {
  const project = await one('SELECT project_id, title, summary, tech_stack FROM student_projects WHERE project_id = $1', [
    projectId,
  ]);
  if (!project) return null;
  const doc = await embedDocument([{ text: projectText(project), weight: 1 }]);
  if (!doc) return null;
  await query(
    `INSERT INTO project_embeddings (project_id, embedding, model, updated_at)
     VALUES ($1, $2::vector, $3, now())
     ON CONFLICT (project_id) DO UPDATE
        SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, updated_at = now()`,
    [projectId, toSqlVector(doc.vector), embeddingModelName()],
  );
  return doc;
}

export async function refreshJobEmbedding(jobId) {
  const job = await one(
    'SELECT job_id, title, description, requirements, required_skills FROM job_postings WHERE job_id = $1',
    [jobId],
  );
  if (!job) return null;
  const doc = await embedDocument(jobSegments(job));
  if (!doc) return null;
  await query(
    `INSERT INTO job_embeddings (job_id, embedding, model, chunk_count, source_chars, updated_at)
     VALUES ($1, $2::vector, $3, $4, $5, now())
     ON CONFLICT (job_id) DO UPDATE
        SET embedding = EXCLUDED.embedding, model = EXCLUDED.model,
            chunk_count = EXCLUDED.chunk_count, source_chars = EXCLUDED.source_chars,
            updated_at = now()`,
    [jobId, toSqlVector(doc.vector), embeddingModelName(), doc.chunkCount, doc.sourceChars],
  );
  return doc;
}

/**
 * Runs an indexing step without failing the user's request.
 * Returns true on success, false if the embedding model is unavailable.
 */
export async function safeIndex(label, fn) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(`[indexing] ${label} failed:`, err?.message || err);
    return false;
  }
}

/** Re-embeds everything (used by `npm run embeddings:rebuild` and the seed script). */
export async function rebuildAllEmbeddings(log = (_message) => {}) {
  const students = await many('SELECT student_id FROM students ORDER BY student_id');
  for (const { student_id } of students) {
    await refreshStudentEmbedding(student_id);
    log(`student ${student_id}`);
  }
  const projects = await many('SELECT project_id FROM student_projects ORDER BY project_id');
  for (const { project_id } of projects) {
    await refreshProjectEmbedding(project_id);
    log(`project ${project_id}`);
  }
  const jobs = await many('SELECT job_id FROM job_postings ORDER BY job_id');
  for (const { job_id } of jobs) {
    await refreshJobEmbedding(job_id);
    log(`job ${job_id}`);
  }
  return { students: students.length, projects: projects.length, jobs: jobs.length };
}
