// Read-only introspection of the PostgreSQL database for the admin "Database" page:
// where the data is stored, tables, sizes, on-disk files, triggers, routines, indexes.
import { many, one, query } from '../db.js';

const VECTOR_TABLES = new Set(['student_embeddings', 'project_embeddings', 'job_embeddings']);

const TABLE_PURPOSE = {
  users: 'Login accounts for all three roles',
  students: 'Student profiles, resumes (bytea) and placement status',
  student_projects: 'Academic projects described by students',
  recruiters: 'Company recruiter profiles',
  departments: 'Lookup table of departments',
  job_postings: 'Jobs posted by recruiters',
  job_eligible_departments: 'Which departments may apply to which job',
  applications: 'A student applying to a job',
  application_status_history: 'Milestones written by a trigger',
  interviews: 'Interview rounds for an application',
  offers: 'Offers made to applicants',
  placement_stats_snapshot: 'Statistics written by a stored procedure',
  student_embeddings: 'One 384-d vector per student profile',
  project_embeddings: 'One 384-d vector per project',
  job_embeddings: 'One 384-d vector per job description',
};

function connectionFromEnv() {
  try {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
      user: decodeURIComponent(url.username),
    };
  } catch {
    return null;
  }
}

/** Server facts: version, data directory, database OID, size, uptime. */
export async function getServerInfo() {
  const info = await one(
    `SELECT current_database()                                    AS database,
            split_part(current_setting('server_version'), ' ', 1) AS server_version,
            (SELECT oid::int FROM pg_database WHERE datname = current_database()) AS database_oid,
            pg_database_size(current_database())                  AS size_bytes,
            pg_size_pretty(pg_database_size(current_database()))  AS size_pretty,
            (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector_version,
            date_trunc('second', now() - pg_postmaster_start_time())::text AS uptime,
            current_user                                          AS db_user,
            current_setting('TimeZone')                           AS timezone`,
  );
  let dataDirectory = null;
  try {
    // Needs superuser or pg_read_all_settings (the Docker image's user is a superuser).
    dataDirectory = (await one(`SELECT current_setting('data_directory') AS d`)).d;
  } catch {
    dataDirectory = null;
  }
  const connection = connectionFromEnv();
  const inDocker = dataDirectory === '/var/lib/postgresql/data';
  return { ...info, dataDirectory, connection, inDocker };
}

/** Every table in the public schema with exact row count, sizes and its data file on disk. */
export async function listTables() {
  const tables = await many(
    `SELECT c.relname                                   AS name,
            pg_relation_filepath(c.oid)                 AS file_path,
            pg_total_relation_size(c.oid)               AS total_bytes,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
            pg_size_pretty(pg_relation_size(c.oid))     AS data_size,
            pg_size_pretty(pg_indexes_size(c.oid))      AS index_size,
            (SELECT count(*) FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS column_count
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`,
  );
  if (tables.length === 0) return [];
  // Exact counts in one round trip (names come from the catalog, never from user input)
  const countSql = tables
    .map((t) => `SELECT '${t.name.replace(/'/g, "''")}' AS name, count(*) AS n FROM "${t.name.replace(/"/g, '""')}"`)
    .join(' UNION ALL ');
  const counts = Object.fromEntries((await many(countSql)).map((r) => [r.name, r.n]));
  return tables.map((t) => ({
    ...t,
    rows: counts[t.name] ?? 0,
    kind: VECTOR_TABLES.has(t.name) ? 'vector' : 'relational',
    purpose: TABLE_PURPOSE[t.name] || '',
  }));
}

/** First rows of one table, with binary, vector and secret columns made readable. */
export async function browseTable(tableName, { limit = 25 } = {}) {
  const tables = await listTables();
  const table = tables.find((t) => t.name === tableName);
  if (!table) return null;

  const columns = await many(
    `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
            t.typname AS base_type
       FROM pg_attribute a
       JOIN pg_type t ON t.oid = a.atttypid
      WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum`,
    [`public."${tableName.replace(/"/g, '""')}"`],
  );

  const q = (name) => `"${name.replace(/"/g, '""')}"`;
  const selectList = columns.map((c) => {
    const col = q(c.name);
    if (c.name === 'password_hash') return `CASE WHEN ${col} IS NULL THEN NULL ELSE '•••••••• (bcrypt hash)' END AS ${col}`;
    if (c.base_type === 'bytea') {
      return `CASE WHEN ${col} IS NULL THEN NULL ELSE 'binary file, ' || pg_size_pretty(octet_length(${col})::bigint) END AS ${col}`;
    }
    if (c.base_type === 'vector' || c.type.startsWith('vector')) {
      return `CASE WHEN ${col} IS NULL THEN NULL ELSE left(${col}::text, 46) || '… (' ||
              array_length(string_to_array(trim(both '[]' from ${col}::text), ','), 1) || ' numbers)' END AS ${col}`;
    }
    return `left(${col}::text, 140) AS ${col}`;
  });

  // ORDER BY the real first column (qualified, so it is not the text alias) to keep numeric ids in order
  const orderBy = `${q(tableName)}.${q(columns[0].name)}`;
  const { rows } = await query(
    `SELECT ${selectList.join(', ')} FROM ${q(tableName)} ORDER BY ${orderBy} LIMIT ${Number(limit) || 25}`,
  );
  return { table, columns, rows };
}

export async function listTriggers() {
  const rows = await many(
    `SELECT t.tgname AS name, c.relname AS table_name, p.proname AS function_name,
            pg_get_triggerdef(t.oid) AS definition
       FROM pg_trigger t
       JOIN pg_class c     ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_proc p      ON p.oid = t.tgfoid
      WHERE NOT t.tgisinternal AND n.nspname = 'public'
      ORDER BY c.relname, t.tgname`,
  );
  return rows.map((r) => {
    const m = r.definition.match(/TRIGGER \S+ (BEFORE|AFTER|INSTEAD OF) (.+?) ON /);
    return { ...r, timing: m?.[1] || '', events: m?.[2] || '' };
  });
}

export async function listRoutines() {
  return many(
    `SELECT p.proname AS name,
            CASE WHEN p.prokind = 'p' THEN 'Stored procedure'
                 WHEN pg_get_function_result(p.oid) = 'trigger' THEN 'Trigger function'
                 ELSE 'Stored function' END AS kind,
            pg_get_function_arguments(p.oid) AS arguments,
            pg_get_function_result(p.oid)    AS returns,
            l.lanname                        AS language
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       JOIN pg_language l  ON l.oid = p.prolang
      WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      ORDER BY CASE WHEN p.prokind = 'p' THEN 0 WHEN pg_get_function_result(p.oid) = 'trigger' THEN 2 ELSE 1 END, p.proname`,
  );
}

export async function listIndexes() {
  return many(
    `SELECT i.relname AS name, t.relname AS table_name, am.amname AS method,
            pg_size_pretty(pg_relation_size(i.oid)) AS size, ix.indisunique AS is_unique,
            ix.indisprimary AS is_primary, pg_get_indexdef(i.oid) AS definition
       FROM pg_index ix
       JOIN pg_class i     ON i.oid = ix.indexrelid
       JOIN pg_class t     ON t.oid = ix.indrelid
       JOIN pg_am am       ON am.oid = i.relam
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY (am.amname = 'hnsw') DESC, t.relname, i.relname`,
  );
}

// ------------------------------------------------------------ query showcase
// Fixed, read-only queries (no user-supplied SQL is ever executed).
export const SHOWCASE_QUERIES = [
  {
    id: 'vector-rank',
    title: 'Rank students for a job by meaning',
    feature: 'Vector similarity search',
    description: 'Cosine similarity between every student vector and the Backend Software Engineer job vector, using pgvector’s <=> operator.',
    sql: `SELECT u.full_name AS student,
       d.code      AS dept,
       round((1 - (se.embedding <=> je.embedding))::numeric, 3) AS cosine_similarity
  FROM student_embeddings se
  JOIN job_embeddings je ON je.job_id = (SELECT job_id FROM job_postings
                                          WHERE title = 'Backend Software Engineer' LIMIT 1)
  JOIN students s    ON s.student_id = se.student_id
  JOIN users u       ON u.user_id = s.student_id
  JOIN departments d ON d.department_id = s.department_id
 ORDER BY se.embedding <=> je.embedding
 LIMIT 8;`,
  },
  {
    id: 'dept-stats',
    title: 'Department-wise placement statistics',
    feature: 'Stored function',
    description: 'Placement percentage and average / median / highest package per department, computed inside PostgreSQL.',
    sql: `SELECT department_code, total_students, placed_students,
       placement_percentage, average_ctc, median_ctc, highest_ctc
  FROM fn_department_placement_stats(NULL)
 ORDER BY placement_percentage DESC NULLS LAST;`,
  },
  {
    id: 'auto-closed',
    title: 'Jobs closed automatically by a trigger',
    feature: 'Trigger',
    description: 'fn_auto_close_job closes a posting when its application limit or hiring quota is reached.',
    sql: `SELECT title, status, closed_reason, max_applications, hiring_quota,
       (SELECT count(*) FROM applications a WHERE a.job_id = j.job_id) AS applications,
       (SELECT count(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'ACCEPTED') AS hired
  FROM job_postings j
 WHERE closed_reason IS NOT NULL
 ORDER BY closed_at DESC;`,
  },
  {
    id: 'milestones',
    title: 'Milestones written by a trigger',
    feature: 'Trigger + audit trail',
    description: 'Every status change of every application, logged by fn_log_application_status with who did it and why.',
    sql: `SELECT to_char(h.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at, u.full_name AS student, j.title AS job,
       h.old_status, h.new_status, h.note
  FROM application_status_history h
  JOIN applications a ON a.application_id = h.application_id
  JOIN users u        ON u.user_id = a.student_id
  JOIN job_postings j ON j.job_id = a.job_id
 ORDER BY h.history_id DESC
 LIMIT 12;`,
  },
  {
    id: 'placed-join',
    title: 'Placed students and their accepted offers',
    feature: 'Multi-table join',
    description: 'Joins seven tables to show who was placed, where, and for how much.',
    sql: `SELECT u.full_name AS student, d.code AS dept, r.company_name AS company,
       j.title AS role, o.ctc_lpa AS ctc_lpa, s.placed_at::date AS placed_on
  FROM students s
  JOIN users u        ON u.user_id = s.student_id
  JOIN departments d  ON d.department_id = s.department_id
  JOIN offers o       ON o.offer_id = s.placed_offer_id
  JOIN applications a ON a.application_id = o.application_id
  JOIN job_postings j ON j.job_id = a.job_id
  JOIN recruiters r   ON r.recruiter_id = j.recruiter_id
 WHERE s.placement_status = 'PLACED'
 ORDER BY o.ctc_lpa DESC;`,
  },
  {
    id: 'files',
    title: 'Where each table is stored on disk',
    feature: 'Storage',
    description: 'pg_relation_filepath gives the file inside the data directory that holds each table’s rows.',
    sql: `SELECT c.relname AS table_name,
       pg_relation_filepath(c.oid) AS file_inside_data_directory,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY pg_total_relation_size(c.oid) DESC;`,
  },
];

export async function runShowcaseQuery(id) {
  const item = SHOWCASE_QUERIES.find((q) => q.id === id);
  if (!item) return null;
  const started = Date.now();
  try {
    const { rows } = await query(item.sql);
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { item, rows, columns, ms: Date.now() - started, error: null };
  } catch (err) {
    return { item, rows: [], columns: [], ms: Date.now() - started, error: err.message };
  }
}
