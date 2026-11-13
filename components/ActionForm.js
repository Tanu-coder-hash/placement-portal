'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Form that submits its FormData to a Server Action and shows the result.
 * The action must return { ok, error?, message?, redirect? } (see lib/errors.js runAction).
 */
export default function ActionForm({
  action,
  children,
  submitLabel = 'Save',
  pendingLabel = 'Saving…',
  submitClassName = 'btn-primary',
  className = 'space-y-4',
  resetOnSuccess = false,
  confirmMessage = null,
  footer = null,
}) {
  const router = useRouter();
  const formRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setResult(null);
    try {
      const res = await action(formData);
      setResult(res);
      if (res?.ok) {
        if (resetOnSuccess) formRef.current?.reset();
        if (res.redirect) {
          router.push(res.redirect);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error(err);
      setResult({ ok: false, error: 'Request failed. Please check your connection and try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className} noValidate={false}>
      {children}
      {result?.ok === false ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {result.error}
        </p>
      ) : null}
      {result?.ok && result.message ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {result.message}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button type="submit" className={submitClassName} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
