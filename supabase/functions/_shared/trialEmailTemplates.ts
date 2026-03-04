/**
 * Branded HTML templates for trial reminder and expiration emails.
 * Matches sendRegistrationEmail pattern: Arial font, blue header, notice boxes.
 */

import type { TrialEmailCopyLocale, TrialEmailLocale } from './trialEmailCopy.ts';

function interpolate(
  text: string,
  vars: { tenantName: string; daysLeft?: number; expiryDate: string }
): string {
  return text
    .replace(/\{\{tenantName\}\}/g, vars.tenantName)
    .replace(/\{\{daysLeft\}\}/g, String(vars.daysLeft ?? ''))
    .replace(/\{\{expiryDate\}\}/g, vars.expiryDate);
}

export function buildTrialReminderHtml(
  tenantName: string,
  daysLeft: number,
  expiryDate: string,
  locale: TrialEmailLocale,
  copy: Record<TrialEmailLocale, TrialEmailCopyLocale>
): string {
  const localeCopy = copy[locale] ?? copy['en-US'];
  const key =
    daysLeft === 7 ? 'reminder_7d' : daysLeft === 3 ? 'reminder_3d' : 'reminder_1d';
  const entry = localeCopy[key];
  const body = interpolate(entry.body, { tenantName, daysLeft, expiryDate });

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Trial Reminder - CastorWorks</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0;">CastorWorks</h1>
    </div>
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #92400e; margin-top: 0;">Trial Reminder</h2>
      <p style="margin: 0; color: #92400e;">${body}</p>
    </div>
    <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #065f46; margin-top: 0;">Upgrade Now</h3>
      <p style="margin: 0; color: #065f46;">Log in to CastorWorks and go to Settings → Subscription to upgrade and keep full access.</p>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
      <p style="font-size: 14px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </body>
</html>
`.trim();
}

export function buildTrialExpirationHtml(
  tenantName: string,
  locale: TrialEmailLocale,
  copy: Record<TrialEmailLocale, TrialEmailCopyLocale>
): string {
  const localeCopy = copy[locale] ?? copy['en-US'];
  const entry = localeCopy.expiration;
  const body = interpolate(entry.body, { tenantName, expiryDate: '' });

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Trial Ended - CastorWorks</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0;">CastorWorks</h1>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #1f2937; margin-top: 0;">Trial Ended</h2>
      <p>${body}</p>
    </div>
    <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #065f46; margin-top: 0;">Upgrade Anytime</h3>
      <p style="margin: 0; color: #065f46;">Log in to CastorWorks and go to Settings → Subscription to upgrade and regain full access.</p>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
      <p style="font-size: 14px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </body>
</html>
`.trim();
}
