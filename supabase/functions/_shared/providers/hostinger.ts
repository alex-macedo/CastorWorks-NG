import nodemailer from 'npm:nodemailer@6.10.1'

interface HostingerAttachmentInput {
  content?: string
  contentType?: string
  filename: string
  path?: string
}

interface SendEmailViaHostingerInput {
  attachments?: HostingerAttachmentInput[]
  cc?: string[]
  fromEmail: string
  fromName: string
  html: string
  replyTo?: string
  subject: string
  text?: string
  to: string | string[]
}

const smtpHost = Deno.env.get('HOSTINGER_SMTP_HOST') ?? ''
const smtpPort = Number(Deno.env.get('HOSTINGER_SMTP_PORT') ?? '465')
const smtpUser = Deno.env.get('HOSTINGER_SMTP_USER')
  ?? Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
  ?? ''
const smtpPass = Deno.env.get('HOSTINGER_SMTP_PASS')
  ?? Deno.env.get('HOSTINGER_EMAIL_PASSWORD')
  ?? ''

export async function sendEmailViaHostinger({
  attachments,
  cc,
  fromEmail,
  fromName,
  html,
  replyTo,
  subject,
  text,
  to,
}: SendEmailViaHostingerInput) {
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error('Hostinger SMTP is not fully configured')
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    cc,
    replyTo,
    subject,
    html,
    text,
    attachments,
  })

  return {
    messageId: info.messageId ?? null,
    accepted: info.accepted ?? [],
    rejected: info.rejected ?? [],
  }
}
