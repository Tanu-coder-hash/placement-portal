'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Button that calls a Server Action with fixed arguments, e.g.
 *   <ActionButton action={acceptOfferAction} args={[offerId]} confirm="Accept this offer?">Accept</ActionButton>
 */
export default function ActionButton({
  action,
  args = [],
  children,
  className = 'btn-secondary btn-sm',
  confirm = null,
  pendingLabel = 'Working…',
  showMessage = true,
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);

  async function handleClick() {
    if (pending) return;
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    setResult(null);
    try {
      const res = await action(...args);
      setResult(res);
      if (res?.ok) {
        if (res.redirect) router.push(res.redirect);
        else router.refresh();
      }
    } catch (err) {
      console.error(err);
      setResult({ ok: false, error: 'Request failed. Please try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={handleClick} className={className} disabled={pending}>
        {pending ? pendingLabel : children}
      </button>
      {result?.ok === false ? (
        <span role="alert" className="max-w-xs text-xs text-red-700">
          {result.error}
        </span>
      ) : null}
      {showMessage && result?.ok && result.message ? (
        <span role="status" className="max-w-xs text-xs text-emerald-700">
          {result.message}
        </span>
      ) : null}
    </span>
  );
}
