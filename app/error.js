'use client';

export default function GlobalError({ error, reset }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-lg text-sm text-slate-500">
        The server could not complete this request. If you are setting the project up, check that PostgreSQL is running,
        <code className="mx-1">DATABASE_URL</code> in <code>.env</code> is correct and you have run{' '}
        <code>npm run db:setup</code>.
      </p>
      {error?.digest ? <p className="text-xs text-slate-400">Error reference: {error.digest}</p> : null}
      <button type="button" onClick={() => reset()} className="btn-primary mt-2">
        Try again
      </button>
    </div>
  );
}
