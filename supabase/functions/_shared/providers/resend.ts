export async function sendEmailViaResend(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'no-reply@castorworks.com',
      to,
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}
