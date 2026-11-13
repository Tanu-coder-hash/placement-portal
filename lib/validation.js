// Small FormData validation helpers (throw AppError with user-facing messages).
import { AppError } from './errors.js';

export function str(formData, name, { label = name, required = false, max = 5000, min = 0 } = {}) {
  const raw = formData.get(name);
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (required && !value) throw new AppError(`${label} is required.`);
  if (value && value.length < min) throw new AppError(`${label} must be at least ${min} characters.`);
  if (value.length > max) throw new AppError(`${label} must be at most ${max} characters.`);
  return value || null;
}

export function num(formData, name, { label = name, required = false, min = -Infinity, max = Infinity, integer = false } = {}) {
  const raw = formData.get(name);
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) {
    if (required) throw new AppError(`${label} is required.`);
    return null;
  }
  const value = Number(text);
  if (!Number.isFinite(value)) throw new AppError(`${label} must be a number.`);
  if (integer && !Number.isInteger(value)) throw new AppError(`${label} must be a whole number.`);
  if (value < min || value > max) throw new AppError(`${label} must be between ${min} and ${max}.`);
  return value;
}

export function email(formData, name = 'email') {
  const value = str(formData, name, { label: 'Email', required: true, max: 255 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) throw new AppError('Please enter a valid email address.');
  return value.toLowerCase();
}

export function password(formData, name = 'password') {
  const value = typeof formData.get(name) === 'string' ? formData.get(name) : '';
  if (value.length < 8) throw new AppError('Password must be at least 8 characters.');
  if (value.length > 128) throw new AppError('Password is too long.');
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new AppError('Password must contain at least one letter and one number.');
  }
  return value;
}

export function date(formData, name, { label = name, required = false, notPast = false } = {}) {
  const value = str(formData, name, { label, required, max: 10 });
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AppError(`${label} must be a valid date.`);
  }
  if (notPast) {
    const today = new Date().toISOString().slice(0, 10);
    if (value < today) throw new AppError(`${label} cannot be in the past.`);
  }
  return value;
}

export function oneOf(formData, name, allowed, { label = name, fallback } = {}) {
  const value = str(formData, name, { label, max: 50 }) ?? fallback;
  if (!allowed.includes(value)) throw new AppError(`${label} has an invalid value.`);
  return value;
}

export function url(formData, name, { label = name } = {}) {
  const value = str(formData, name, { label, max: 300 });
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    return parsed.toString();
  } catch {
    throw new AppError(`${label} must be a valid http(s) URL.`);
  }
}

export function id(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`Invalid ${label}.`);
  return n;
}
