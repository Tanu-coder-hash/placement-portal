// Inline recruiter forms (rendered inside <details> panels on the job page).
import ActionForm from './ActionForm';
import DateTimeField from './DateTimeField';
import { issueOfferAction, recordInterviewAction, scheduleInterviewAction } from '@/app/actions/recruiter';

export function ScheduleInterviewForm({ applicationId, nextRound }) {
  return (
    <ActionForm action={scheduleInterviewAction} submitLabel={`Schedule round ${nextRound}`} pendingLabel="Scheduling…" submitClassName="btn-primary btn-sm" className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`round-${applicationId}`}>
            Round name
          </label>
          <input
            id={`round-${applicationId}`}
            name="roundName"
            required
            maxLength={80}
            defaultValue={nextRound === 1 ? 'Technical interview' : nextRound === 2 ? 'Managerial interview' : 'HR interview'}
            className="input"
          />
        </div>
        <DateTimeField name="scheduledAt" label="Date & time" required />
        <div>
          <label className="label" htmlFor={`duration-${applicationId}`}>
            Duration (minutes)
          </label>
          <input id={`duration-${applicationId}`} name="durationMinutes" type="number" min="10" max="480" defaultValue="45" className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`mode-${applicationId}`}>
            Mode
          </label>
          <select id={`mode-${applicationId}`} name="mode" className="input" defaultValue="ONLINE">
            <option value="ONLINE">Online</option>
            <option value="ONSITE">On-site</option>
            <option value="PHONE">Phone</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`loc-${applicationId}`}>
            Meeting link or venue
          </label>
          <input id={`loc-${applicationId}`} name="locationOrLink" maxLength={300} className="input" placeholder="https://meet… or Room 204, Placement Cell" />
        </div>
      </div>
      <p className="hint">A trigger rejects slots that overlap another interview of this candidate.</p>
    </ActionForm>
  );
}

export function OfferForm({ applicationId, defaultCtc }) {
  return (
    <ActionForm action={issueOfferAction} submitLabel="Send offer" pendingLabel="Sending…" submitClassName="btn-success btn-sm" className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor={`ctc-${applicationId}`}>
            CTC (₹ LPA)
          </label>
          <input id={`ctc-${applicationId}`} name="ctcLpa" type="number" step="0.01" min="0.01" required defaultValue={defaultCtc} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`join-${applicationId}`}>
            Joining date
          </label>
          <input id={`join-${applicationId}`} name="joiningDate" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`respond-${applicationId}`}>
            Respond by
          </label>
          <input id={`respond-${applicationId}`} name="respondBy" type="date" className="input" />
          <p className="hint">Default: 7 days</p>
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor={`notes-${applicationId}`}>
            Notes for the candidate
          </label>
          <textarea id={`notes-${applicationId}`} name="notes" rows={2} maxLength={2000} className="input" />
        </div>
      </div>
    </ActionForm>
  );
}

export function InterviewOutcomeForm({ interviewId }) {
  return (
    <ActionForm action={recordInterviewAction} submitLabel="Save outcome" pendingLabel="Saving…" submitClassName="btn-primary btn-sm" className="space-y-3">
      <input type="hidden" name="interviewId" value={interviewId} />
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="result" value="PASSED" required /> Passed
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="result" value="FAILED" /> Failed
        </label>
      </div>
      <textarea name="feedback" rows={2} maxLength={3000} className="input" placeholder="Feedback (shared with the candidate)" />
    </ActionForm>
  );
}
