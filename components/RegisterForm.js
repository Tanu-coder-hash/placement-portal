'use client';

import { useState } from 'react';
import ActionForm from './ActionForm';
import { registerAction } from '@/app/actions/auth';

export default function RegisterForm({ departments }) {
  const [role, setRole] = useState('STUDENT');
  const thisYear = new Date().getFullYear();

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1" role="tablist">
        {[
          ['STUDENT', 'I am a student'],
          ['RECRUITER', 'I am a recruiter'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={role === value}
            onClick={() => setRole(value)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              role === value ? "bg-ink-900 text-white" : "text-slate-600 hover:text-ink-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ActionForm
        key={role}
        action={registerAction}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        submitClassName="btn-primary w-full"
      >
        <input type="hidden" name="role" value={role} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="fullName">
              Full name
            </label>
            <input id="fullName" name="fullName" required className="input" autoComplete="name" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">
              {role === 'STUDENT' ? 'College email' : 'Work email'}
            </label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
            <p className="hint">8+ characters with a letter and a number.</p>
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input id="confirmPassword" name="confirmPassword" type="password" required className="input" autoComplete="new-password" />
          </div>

          {role === 'STUDENT' ? (
            <>
              <div>
                <label className="label" htmlFor="rollNumber">
                  Roll number
                </label>
                <input id="rollNumber" name="rollNumber" required className="input" placeholder="e.g. 21CSE042" />
              </div>
              <div>
                <label className="label" htmlFor="departmentId">
                  Department
                </label>
                <select id="departmentId" name="departmentId" required className="input" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="graduationYear">
                  Graduation year
                </label>
                <input
                  id="graduationYear"
                  name="graduationYear"
                  type="number"
                  required
                  min={thisYear - 2}
                  max={thisYear + 5}
                  defaultValue={thisYear + 1}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="cgpa">
                  CGPA (out of 10)
                </label>
                <input id="cgpa" name="cgpa" type="number" step="0.01" min="0" max="10" required className="input" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="companyName">
                  Company
                </label>
                <input id="companyName" name="companyName" required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="designation">
                  Your designation
                </label>
                <input id="designation" name="designation" className="input" placeholder="e.g. Talent Acquisition Lead" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="companyWebsite">
                  Company website
                </label>
                <input id="companyWebsite" name="companyWebsite" type="url" className="input" placeholder="https://" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="phone">
              Phone (optional)
            </label>
            <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          New accounts are reviewed by the placement office. You can sign in right away, but applying for jobs or
          posting openings unlocks after verification.
        </p>
      </ActionForm>
    </div>
  );
}
