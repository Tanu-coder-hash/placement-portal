-- =====================================================================
-- 01_schema.sql  —  Relational schema + vector store (PostgreSQL 14+ with pgvector)
--
-- One PostgreSQL database plays both roles from the design:
--   * Relational store: users, students, recruiters, job postings,
--     applications, interviews, offers (strict integrity via FKs,
--     CHECK constraints, ENUM types and triggers).
--   * Vector store: pgvector `vector(384)` columns holding
--     all-MiniLM-L6-v2 embeddings, searched with cosine distance (<=>)
--     through HNSW indexes.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------
-- ENUM types (domain integrity for every status column)
-- ---------------------------------------------------------------------
CREATE TYPE user_role           AS ENUM ('STUDENT', 'RECRUITER', 'ADMIN');
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE placement_status    AS ENUM ('UNPLACED', 'PLACED');
CREATE TYPE job_type            AS ENUM ('FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO');
CREATE TYPE job_status          AS ENUM ('PENDING_APPROVAL', 'OPEN', 'CLOSED', 'REJECTED');
CREATE TYPE application_status  AS ENUM ('APPLIED', 'SHORTLISTED', 'INTERVIEWING',
                                         'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE interview_mode      AS ENUM ('ONLINE', 'ONSITE', 'PHONE');
CREATE TYPE interview_status    AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE interview_result    AS ENUM ('PENDING', 'PASSED', 'FAILED');
CREATE TYPE offer_status        AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- ---------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------
CREATE TABLE departments (
    department_id  SERIAL PRIMARY KEY,
    code           VARCHAR(10)  NOT NULL UNIQUE,
    name           VARCHAR(100) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Users (authentication + role) — supertype of students / recruiters
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id              SERIAL PRIMARY KEY,
    email                VARCHAR(255) NOT NULL,
    password_hash        TEXT         NOT NULL,
    full_name            VARCHAR(120) NOT NULL,
    role                 user_role    NOT NULL,
    verification_status  verification_status NOT NULL DEFAULT 'PENDING',
    verified_by          INT REFERENCES users(user_id) ON DELETE SET NULL,
    verified_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at        TIMESTAMPTZ,
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
-- Case-insensitive uniqueness of e-mail addresses
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
CREATE INDEX idx_users_role_verification ON users (role, verification_status);

-- ---------------------------------------------------------------------
-- Students (1:1 with users, ISA specialisation)
-- ---------------------------------------------------------------------
CREATE TABLE students (
    student_id         INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    roll_number        VARCHAR(20)  NOT NULL UNIQUE,
    department_id      INT          NOT NULL REFERENCES departments(department_id),
    graduation_year    SMALLINT     NOT NULL CHECK (graduation_year BETWEEN 2000 AND 2100),
    cgpa               NUMERIC(4,2) CHECK (cgpa BETWEEN 0 AND 10),
    phone              VARCHAR(20),
    headline           VARCHAR(160),
    skills             TEXT[]       NOT NULL DEFAULT '{}',
    resume_text        TEXT,
    resume_filename    VARCHAR(255),
    resume_mime        VARCHAR(100),
    resume_file        BYTEA,
    resume_updated_at  TIMESTAMPTZ,
    placement_status   placement_status NOT NULL DEFAULT 'UNPLACED',
    placed_offer_id    INT,          -- FK added below (offers is created later)
    placed_at          TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_students_placed_has_date
        CHECK (placement_status = 'UNPLACED' OR placed_at IS NOT NULL),
    CONSTRAINT chk_students_resume_size
        CHECK (resume_file IS NULL OR octet_length(resume_file) <= 5 * 1024 * 1024)
);
CREATE INDEX idx_students_department_year ON students (department_id, graduation_year);
CREATE INDEX idx_students_skills          ON students USING GIN (skills);

CREATE TABLE student_projects (
    project_id   SERIAL PRIMARY KEY,
    student_id   INT          NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    title        VARCHAR(150) NOT NULL,
    summary      TEXT         NOT NULL,
    tech_stack   TEXT[]       NOT NULL DEFAULT '{}',
    project_url  VARCHAR(300),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_student ON student_projects (student_id);

-- ---------------------------------------------------------------------
-- Recruiters (1:1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE recruiters (
    recruiter_id         INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    company_name         VARCHAR(150) NOT NULL,
    designation          VARCHAR(100),
    company_website      VARCHAR(300),
    phone                VARCHAR(20),
    company_description  TEXT
);
CREATE INDEX idx_recruiters_company ON recruiters (company_name);

-- ---------------------------------------------------------------------
-- Job postings
-- ---------------------------------------------------------------------
CREATE TABLE job_postings (
    job_id                SERIAL PRIMARY KEY,
    recruiter_id          INT          NOT NULL REFERENCES recruiters(recruiter_id) ON DELETE CASCADE,
    title                 VARCHAR(150) NOT NULL,
    description           TEXT         NOT NULL,
    requirements          TEXT         NOT NULL,
    required_skills       TEXT[]       NOT NULL DEFAULT '{}',
    job_type              job_type     NOT NULL DEFAULT 'FULL_TIME',
    location              VARCHAR(120),
    ctc_lpa               NUMERIC(6,2) NOT NULL CHECK (ctc_lpa >= 0),
    min_cgpa              NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (min_cgpa BETWEEN 0 AND 10),
    max_applications      INT          CHECK (max_applications IS NULL OR max_applications > 0),
    hiring_quota          INT          NOT NULL DEFAULT 1 CHECK (hiring_quota > 0),
    application_deadline  DATE,
    status                job_status   NOT NULL DEFAULT 'PENDING_APPROVAL',
    closed_reason         VARCHAR(40),
    closed_at             TIMESTAMPTZ,
    reviewed_by           INT REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at           TIMESTAMPTZ,
    review_note           TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_jobs_closed_reason CHECK (
        closed_reason IS NULL OR closed_reason IN
        ('APPLICATION_LIMIT_REACHED', 'HIRING_QUOTA_FILLED', 'DEADLINE_PASSED', 'CLOSED_BY_RECRUITER', 'CLOSED_BY_ADMIN'))
);
CREATE INDEX idx_jobs_status     ON job_postings (status);
CREATE INDEX idx_jobs_recruiter  ON job_postings (recruiter_id);
CREATE INDEX idx_jobs_skills     ON job_postings USING GIN (required_skills);

-- Optional department restriction (no rows = open to all departments)
CREATE TABLE job_eligible_departments (
    job_id         INT NOT NULL REFERENCES job_postings(job_id) ON DELETE CASCADE,
    department_id  INT NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, department_id)
);

-- ---------------------------------------------------------------------
-- Applications (M:N between students and job postings)
-- ---------------------------------------------------------------------
CREATE TABLE applications (
    application_id  SERIAL PRIMARY KEY,
    job_id          INT NOT NULL REFERENCES job_postings(job_id) ON DELETE CASCADE,
    student_id      INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    status          application_status NOT NULL DEFAULT 'APPLIED',
    match_score     NUMERIC(5,4) CHECK (match_score IS NULL OR match_score BETWEEN -1 AND 1),
    cover_note      TEXT,
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_applications_job_student UNIQUE (job_id, student_id)
);
CREATE INDEX idx_applications_student    ON applications (student_id, status);
CREATE INDEX idx_applications_job_status ON applications (job_id, status);

-- Milestone / audit trail, written exclusively by a trigger
CREATE TABLE application_status_history (
    history_id      BIGSERIAL PRIMARY KEY,
    application_id  INT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    old_status      application_status,
    new_status      application_status NOT NULL,
    changed_by      INT REFERENCES users(user_id) ON DELETE SET NULL,
    note            TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_application ON application_status_history (application_id, changed_at);

-- ---------------------------------------------------------------------
-- Interviews (1 application : N rounds)
-- ---------------------------------------------------------------------
CREATE TABLE interviews (
    interview_id      SERIAL PRIMARY KEY,
    application_id    INT          NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    round_number      SMALLINT     NOT NULL CHECK (round_number > 0),
    round_name        VARCHAR(80)  NOT NULL,
    scheduled_at      TIMESTAMPTZ  NOT NULL,
    duration_minutes  SMALLINT     NOT NULL DEFAULT 45 CHECK (duration_minutes BETWEEN 10 AND 480),
    mode              interview_mode   NOT NULL DEFAULT 'ONLINE',
    location_or_link  VARCHAR(300),
    status            interview_status NOT NULL DEFAULT 'SCHEDULED',
    result            interview_result NOT NULL DEFAULT 'PENDING',
    feedback          TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_interviews_round UNIQUE (application_id, round_number),
    CONSTRAINT chk_interviews_result_when_completed
        CHECK (status = 'COMPLETED' OR result = 'PENDING')
);
CREATE INDEX idx_interviews_application ON interviews (application_id);
CREATE INDEX idx_interviews_schedule    ON interviews (scheduled_at) WHERE status = 'SCHEDULED';

-- ---------------------------------------------------------------------
-- Offers (1:1 with an application)
-- ---------------------------------------------------------------------
CREATE TABLE offers (
    offer_id       SERIAL PRIMARY KEY,
    application_id INT          NOT NULL UNIQUE REFERENCES applications(application_id) ON DELETE CASCADE,
    ctc_lpa        NUMERIC(6,2) NOT NULL CHECK (ctc_lpa > 0),
    joining_date   DATE,
    respond_by     DATE         NOT NULL DEFAULT (CURRENT_DATE + 7),
    status         offer_status NOT NULL DEFAULT 'PENDING',
    notes          TEXT,
    issued_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    responded_at   TIMESTAMPTZ,
    CONSTRAINT chk_offers_responded CHECK (status IN ('PENDING', 'EXPIRED', 'REVOKED') OR responded_at IS NOT NULL)
);
CREATE INDEX idx_offers_status ON offers (status);

ALTER TABLE students
    ADD CONSTRAINT fk_students_placed_offer
    FOREIGN KEY (placed_offer_id) REFERENCES offers(offer_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- VECTOR STORE (pgvector)
--   384 dimensions = all-MiniLM-L6-v2 (OpenAI text-embedding-3-small is
--   requested with dimensions=384 so both providers share the schema).
--   Cosine similarity = 1 - (a <=> b)
-- ---------------------------------------------------------------------
CREATE TABLE student_embeddings (
    student_id   INT PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
    embedding    vector(384) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    chunk_count  INT NOT NULL DEFAULT 1,
    source_chars INT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_embeddings (
    project_id   INT PRIMARY KEY REFERENCES student_projects(project_id) ON DELETE CASCADE,
    embedding    vector(384) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_embeddings (
    job_id       INT PRIMARY KEY REFERENCES job_postings(job_id) ON DELETE CASCADE,
    embedding    vector(384) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    chunk_count  INT NOT NULL DEFAULT 1,
    source_chars INT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approximate-nearest-neighbour indexes for cosine distance
CREATE INDEX idx_student_embeddings_hnsw ON student_embeddings USING hnsw (embedding vector_cosine_ops); -- vector-index
CREATE INDEX idx_project_embeddings_hnsw ON project_embeddings USING hnsw (embedding vector_cosine_ops); -- vector-index
CREATE INDEX idx_job_embeddings_hnsw     ON job_embeddings     USING hnsw (embedding vector_cosine_ops); -- vector-index

-- ---------------------------------------------------------------------
-- Snapshot table filled by the stored procedure sp_refresh_placement_stats
--   graduation_year = 0 means "all batches"
-- ---------------------------------------------------------------------
CREATE TABLE placement_stats_snapshot (
    department_id         INT      NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    graduation_year       SMALLINT NOT NULL DEFAULT 0,
    total_students        INT      NOT NULL,
    placed_students       INT      NOT NULL,
    placement_percentage  NUMERIC(5,2),
    average_ctc           NUMERIC(8,2),
    median_ctc            NUMERIC(8,2),
    highest_ctc           NUMERIC(8,2),
    lowest_ctc            NUMERIC(8,2),
    total_offers          INT      NOT NULL DEFAULT 0,
    computed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (department_id, graduation_year)
);
