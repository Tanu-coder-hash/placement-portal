import ActionButton from '@/components/ActionButton';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, DefinitionList, PageHeader, SkillChips, StatusBadge } from '@/components/ui';
import {
  addProjectAction,
  deleteProjectAction,
  rebuildMyEmbeddingAction,
  saveResumeTextAction,
  updateProfileAction,
  uploadResumeAction,
} from '@/app/actions/student';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { getStudentProfile, listProjects } from '@/lib/services/students';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const user = await requireUser('STUDENT');
  const [profile, projects] = await Promise.all([getStudentProfile(user.user_id), listProjects(user.user_id)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile & resume"
        subtitle="Everything here is embedded into a 384-dimension vector that powers your job matches."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Academic record" description="Set at registration and verified by the placement office.">
            <DefinitionList
              items={[
                ['Name', profile.full_name],
                ['Email', profile.email],
                ['Roll number', profile.roll_number],
                ['Department', `${profile.department_name} (${profile.department_code})`],
                ['Graduation year', profile.graduation_year],
                ['CGPA', profile.cgpa],
                ['Verification', <StatusBadge key="v" status={profile.verification_status} />],
                ['Placement', <StatusBadge key="p" status={profile.placement_status} />],
              ]}
            />
          </Card>

          <Card title="Headline & skills">
            <ActionForm action={updateProfileAction} submitLabel="Save profile">
              <div>
                <label className="label" htmlFor="headline">
                  Headline
                </label>
                <input
                  id="headline"
                  name="headline"
                  maxLength={160}
                  defaultValue={profile.headline || ''}
                  className="input"
                  placeholder="e.g. Final-year CSE student who loves building backend systems"
                />
              </div>
              <div>
                <label className="label" htmlFor="skills">
                  Skills
                </label>
                <textarea
                  id="skills"
                  name="skills"
                  rows={3}
                  defaultValue={profile.skills.join(', ')}
                  className="input"
                  placeholder="Python, SQL, React, Docker, Machine Learning"
                />
                <p className="hint">Comma-separated. Skills carry extra weight in your AI profile.</p>
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input id="phone" name="phone" maxLength={20} defaultValue={profile.phone || ''} className="input" />
              </div>
            </ActionForm>
          </Card>

          <Card
            title="Resume"
            description={
              profile.resume_updated_at
                ? `Last updated ${formatDateTime(profile.resume_updated_at)}${profile.resume_filename ? ` · ${profile.resume_filename}` : ' · pasted text'}`
                : 'No resume yet.'
            }
            actions={
              profile.resume_text ? (
                <a href={`/api/resume/${profile.student_id}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                  View
                </a>
              ) : null
            }
          >
            <div className="space-y-6">
              <ActionForm action={uploadResumeAction} submitLabel="Upload resume" pendingLabel="Extracting text…" resetOnSuccess>
                <div>
                  <label className="label" htmlFor="resume">
                    Upload a PDF or .txt file (max 4 MB)
                  </label>
                  <input
                    id="resume"
                    name="resume"
                    type="file"
                    required
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>
              </ActionForm>

              <details className="rounded-lg border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Or paste / edit your resume text
                </summary>
                <div className="mt-3">
                  <ActionForm action={saveResumeTextAction} submitLabel="Save text">
                    <textarea
                      name="resumeText"
                      rows={12}
                      defaultValue={profile.resume_text || ''}
                      className="input font-mono text-xs"
                      placeholder="Paste the full text of your resume here"
                    />
                  </ActionForm>
                </div>
              </details>

              {profile.resume_text ? (
                <div>
                  <div className="mb-1 field-label">
                    Extracted text preview
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {profile.resume_text.slice(0, 1500)}
                    {profile.resume_text.length > 1500 ? '…' : ''}
                  </pre>
                </div>
              ) : null}
            </div>
          </Card>

          <Card title="Academic projects" description="Each project gets its own embedding, so recruiters see which one best fits their role.">
            {projects.length ? (
              <ul className="mb-6 space-y-3">
                {projects.map((p) => (
                  <li key={p.project_id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{p.title}</span>
                          {p.indexed ? <Badge tone="green">Indexed</Badge> : <Badge tone="slate">Not indexed</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{p.summary}</p>
                        <div className="mt-2">
                          <SkillChips skills={p.tech_stack} />
                        </div>
                        {p.project_url ? (
                          <a href={p.project_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-brand-700 hover:underline">
                            {p.project_url}
                          </a>
                        ) : null}
                      </div>
                      <ActionButton
                        action={deleteProjectAction}
                        args={[p.project_id]}
                        className="btn-ghost btn-sm text-red-600"
                        confirm={`Delete "${p.title}"?`}
                        showMessage={false}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            <ActionForm action={addProjectAction} submitLabel="Add project" pendingLabel="Adding…" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="title">
                    Project title
                  </label>
                  <input id="title" name="title" required maxLength={150} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="summary">
                    What did you build and how?
                  </label>
                  <textarea id="summary" name="summary" required rows={4} minLength={30} maxLength={3000} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="techStack">
                    Tech stack
                  </label>
                  <input id="techStack" name="techStack" className="input" placeholder="React, Node.js, PostgreSQL" />
                </div>
                <div>
                  <label className="label" htmlFor="projectUrl">
                    Link (optional)
                  </label>
                  <input id="projectUrl" name="projectUrl" type="url" className="input" placeholder="https://github.com/…" />
                </div>
              </div>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="AI matching profile">
            {profile.embedding_updated_at ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Badge tone="green">Indexed</Badge>
                  <span className="text-slate-600">{formatDateTime(profile.embedding_updated_at)}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Model <code>{profile.embedding_model}</code> · {profile.chunk_count} chunk(s) averaged into one
                  384-d vector, stored in <code>student_embeddings</code> with an HNSW index.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not indexed yet — add skills, a project or a resume.</p>
            )}
            <div className="mt-4">
              <ActionButton action={rebuildMyEmbeddingAction} className="btn-secondary btn-sm" pendingLabel="Embedding…">
                Rebuild AI profile
              </ActionButton>
            </div>
          </Card>

          <Card title="Your skills">
            <SkillChips skills={profile.skills} max={40} />
          </Card>
        </div>
      </div>
    </div>
  );
}
