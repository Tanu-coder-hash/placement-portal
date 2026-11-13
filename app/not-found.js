import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-500">The page you are looking for does not exist or you do not have access to it.</p>
      <Link href="/" className="btn-primary mt-2">
        Go home
      </Link>
    </div>
  );
}
