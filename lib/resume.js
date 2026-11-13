// Resume text extraction (PDF or plain text).
import { AppError } from './errors.js';

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // 4 MB

export function cleanResumeText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 60_000);
}

/**
 * file: a web File from FormData.
 * Returns { text, buffer, filename, mime }.
 */
export async function extractResume(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    throw new AppError('Please choose a PDF or .txt file to upload.');
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new AppError('The resume must be smaller than 4 MB.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = String(file.name || 'resume').replace(/[^\w.\- ]+/g, '_').slice(0, 200);
  const lower = filename.toLowerCase();
  const isPdf = buffer.subarray(0, 5).toString('latin1') === '%PDF-';

  let text;
  let mime;
  if (isPdf) {
    // Import the library entry directly: pdf-parse's index.js runs a debug harness.
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    try {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } catch (err) {
      console.error('[resume] PDF parse failed', err);
      throw new AppError('This PDF could not be read. Try exporting it again, or paste the text instead.');
    }
    mime = 'application/pdf';
  } else if ((file.type || '').startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) {
    text = buffer.toString('utf8');
    mime = 'text/plain';
  } else {
    throw new AppError('Only PDF or plain-text (.txt) resumes are supported.');
  }

  text = cleanResumeText(text);
  if (text.length < 80) {
    throw new AppError(
      'Not enough text could be read from this file. If it is a scanned PDF, paste your resume text instead.',
    );
  }
  return { text, buffer, filename, mime };
}
