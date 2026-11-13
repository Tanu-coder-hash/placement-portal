'use server';

import { redirect } from 'next/navigation';
import { clearSessionCookie, createSessionCookie } from '@/lib/auth';
import { AppError, runAction } from '@/lib/errors';
import { dashboardPathFor } from '@/lib/jwt';
import { email, num, oneOf, password, str, url } from '@/lib/validation';
import { authenticate, registerRecruiter, registerStudent } from '@/lib/services/accounts';
import { one } from '@/lib/db';

/** Only allow redirects back into the user's own area (prevents open redirects). */
function safeNext(next, role) {
  const home = dashboardPathFor(role);
  if (typeof next === 'string' && (next === home || next.startsWith(`${home}/`)) && !next.includes('//')) {
    return next;
  }
  return home;
}

export async function loginAction(formData) {
  return runAction(async () => {
    const userEmail = email(formData);
    const pw = formData.get('password');
    if (typeof pw !== 'string' || !pw) throw new AppError('Password is required.');
    const user = await authenticate(userEmail, pw);
    await createSessionCookie(user);
    return { redirect: safeNext(formData.get('next'), user.role) };
  });
}

export async function registerAction(formData) {
  return runAction(async () => {
    const role = oneOf(formData, 'role', ['STUDENT', 'RECRUITER'], { label: 'Account type' });
    const fullName = str(formData, 'fullName', { label: 'Full name', required: true, min: 2, max: 120 });
    const userEmail = email(formData);
    const pw = password(formData);
    if (formData.get('confirmPassword') !== pw) throw new AppError('Passwords do not match.');
    const phone = str(formData, 'phone', { label: 'Phone', max: 20 });

    let user;
    if (role === 'STUDENT') {
      const rollNumber = str(formData, 'rollNumber', { label: 'Roll number', required: true, max: 20 });
      if (!/^[A-Za-z0-9/-]{3,20}$/.test(rollNumber)) {
        throw new AppError('Roll number may only contain letters, digits, "/" and "-".');
      }
      const departmentId = num(formData, 'departmentId', { label: 'Department', required: true, integer: true, min: 1 });
      const dept = await one('SELECT 1 FROM departments WHERE department_id = $1', [departmentId]);
      if (!dept) throw new AppError('Please choose a valid department.');
      const graduationYear = num(formData, 'graduationYear', {
        label: 'Graduation year',
        required: true,
        integer: true,
        min: 2000,
        max: 2100,
      });
      const cgpa = num(formData, 'cgpa', { label: 'CGPA', required: true, min: 0, max: 10 });
      user = await registerStudent({ fullName, email: userEmail, password: pw, rollNumber, departmentId, graduationYear, cgpa, phone });
    } else {
      const companyName = str(formData, 'companyName', { label: 'Company name', required: true, max: 150 });
      const designation = str(formData, 'designation', { label: 'Designation', max: 100 });
      const companyWebsite = url(formData, 'companyWebsite', { label: 'Company website' });
      user = await registerRecruiter({ fullName, email: userEmail, password: pw, companyName, designation, companyWebsite, phone });
    }

    await createSessionCookie(user);
    return { redirect: dashboardPathFor(user.role) };
  });
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect('/login');
}
