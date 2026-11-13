// Secure resume download: students (own), verified recruiters and admins only.
import { getCurrentUser } from '@/lib/auth';
import { getResumeFileForViewer } from '@/lib/services/students';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Please sign in.', { status: 401 });

  const { studentId } = await params;
  const sid = Number(studentId);
  if (!Number.isInteger(sid) || sid <= 0) return new Response('Invalid student id.', { status: 400 });

  const row = await getResumeFileForViewer(sid, user);
  if (!row) return new Response('Not found.', { status: 404 });

  const baseName = (row.full_name || 'resume').replace(/[^\w-]+/g, '_');
  const headers = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };

  if (row.resume_file) {
    const ext = row.resume_mime === 'application/pdf' ? 'pdf' : 'txt';
    return new Response(row.resume_file, {
      headers: {
        ...headers,
        'Content-Type': row.resume_mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${baseName}_resume.${ext}"`,
      },
    });
  }
  if (row.resume_text) {
    return new Response(row.resume_text, {
      headers: {
        ...headers,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${baseName}_resume.txt"`,
      },
    });
  }
  return new Response('This student has not uploaded a resume yet.', { status: 404 });
}
