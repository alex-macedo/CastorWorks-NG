import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailViaHostinger } from './providers/index.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const smtpUser = Deno.env.get('HOSTINGER_SMTP_USER')
  ?? Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
  ?? ''

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null

interface WaitlistEmailInput {
  companyName: string
  locale: string
  userEmail: string
  userName: string
}

export async function sendWaitlistConfirmationEmail({
  companyName,
  locale,
  userEmail,
  userName,
}: WaitlistEmailInput) {
  if (!smtpUser) {
    throw new Error('Hostinger SMTP is not fully configured')
  }

  let companySettings: {
    company_name?: string | null
    email?: string | null
    name?: string | null
  } | null = null

  if (supabase) {
    const { data } = await supabase
      .from('company_settings')
      .select('name, company_name, email')
      .single()

    companySettings = data
  }

  const senderName = companySettings?.company_name || companySettings?.name || 'CastorWorks'
  const replyTo = companySettings?.email || smtpUser
  const safeCompanyName = companyName || (locale === 'pt-BR' ? 'sua empresa' : 'your company')
  const isPt = locale === 'pt-BR'

  const subject = isPt
    ? 'Voce entrou na lista de espera da CastorWorks'
    : 'You joined the CastorWorks waiting list'

  const html = isPt
    ? `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
          <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff;">
              <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #bae6fd;">Lista de Espera</p>
              <h1 style="margin: 12px 0 0; font-size: 32px; line-height: 1.15;">Seu nome esta na lista</h1>
            </div>
            <div style="padding: 32px;">
              <p>Ola ${escapeHtml(userName)},</p>
              <p>Confirmamos que seu contato foi adicionado a lista de espera da CastorWorks para ${escapeHtml(safeCompanyName)}.</p>
              <p>Vamos manter voce informado sobre o lancamento, novidades do produto e os proximos passos para acesso antecipado.</p>
              <div style="margin: 24px 0; padding: 20px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe;">
                <p style="margin: 0; font-weight: 700;">O que acontece agora</p>
                <p style="margin: 8px 0 0;">Nossa equipe vai priorizar contatos da lista de espera para convites, validacao de interesse e onboarding guiado.</p>
              </div>
              <p>Se quiser complementar algum contexto sobre sua operacao, basta responder este email.</p>
              <p style="margin: 24px 0 0;">Equipe ${escapeHtml(senderName)}</p>
            </div>
          </div>
        </body>
      </html>
    `
    : `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
          <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff;">
              <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #bae6fd;">Waiting List</p>
              <h1 style="margin: 12px 0 0; font-size: 32px; line-height: 1.15;">You are on the list</h1>
            </div>
            <div style="padding: 32px;">
              <p>Hello ${escapeHtml(userName)},</p>
              <p>We have added your contact to the CastorWorks waiting list for ${escapeHtml(safeCompanyName)}.</p>
              <p>We will keep you posted on launch timing, product updates, and the next steps for early access.</p>
              <div style="margin: 24px 0; padding: 20px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe;">
                <p style="margin: 0; font-weight: 700;">What happens next</p>
                <p style="margin: 8px 0 0;">Our team will prioritize waitlist contacts for invites, qualification, and guided onboarding.</p>
              </div>
              <p>If you want to share more context about your operation, simply reply to this email.</p>
              <p style="margin: 24px 0 0;">${escapeHtml(senderName)} team</p>
            </div>
          </div>
        </body>
      </html>
    `

  const info = await sendEmailViaHostinger({
    fromEmail: smtpUser,
    fromName: senderName,
    html,
    replyTo,
    subject,
    to: userEmail,
  })

  return {
    emailId: info.messageId ?? null,
    subject,
    body: html,
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
