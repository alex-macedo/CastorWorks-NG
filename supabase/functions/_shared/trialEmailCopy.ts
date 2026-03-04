/**
 * Trial email copy for all 4 locales.
 * Used by execute-trial-emails Edge Function.
 * Placeholders: {{tenantName}}, {{daysLeft}}, {{expiryDate}}
 */

export type TrialEmailLocale = 'en-US' | 'pt-BR' | 'es-ES' | 'fr-FR';

export interface TrialEmailCopyEntry {
  subject: string;
  body: string;
}

export interface TrialEmailCopyLocale {
  reminder_7d: TrialEmailCopyEntry;
  reminder_3d: TrialEmailCopyEntry;
  reminder_1d: TrialEmailCopyEntry;
  expiration: TrialEmailCopyEntry;
}

export const trialEmailCopy: Record<TrialEmailLocale, TrialEmailCopyLocale> = {
  'en-US': {
    reminder_7d: {
      subject: 'Your CastorWorks trial ends in 7 days',
      body:
        'Your trial for {{tenantName}} ends in 7 days ({{expiryDate}}). Upgrade now to keep full access to all features.',
    },
    reminder_3d: {
      subject: 'Your CastorWorks trial ends in 3 days',
      body:
        'Your trial for {{tenantName}} ends in 3 days ({{expiryDate}}). Don\'t miss out — upgrade now to continue using CastorWorks without interruption.',
    },
    reminder_1d: {
      subject: 'Your CastorWorks trial ends tomorrow',
      body:
        'Your trial for {{tenantName}} ends tomorrow ({{expiryDate}}). Upgrade now to keep full access. After expiry, you\'ll move to a limited sandbox tier.',
    },
    expiration: {
      subject: 'Your CastorWorks trial has ended',
      body:
        'Your trial for {{tenantName}} has ended. You now have access to a limited sandbox tier. Upgrade at any time to regain full access to all modules.',
    },
  },
  'pt-BR': {
    reminder_7d: {
      subject: 'Seu período de teste do CastorWorks termina em 7 dias',
      body:
        'Seu período de teste para {{tenantName}} termina em 7 dias ({{expiryDate}}). Faça o upgrade agora para manter acesso completo.',
    },
    reminder_3d: {
      subject: 'Seu período de teste do CastorWorks termina em 3 dias',
      body:
        'Seu período de teste para {{tenantName}} termina em 3 dias ({{expiryDate}}). Não perca — faça o upgrade agora para continuar usando o CastorWorks.',
    },
    reminder_1d: {
      subject: 'Seu período de teste do CastorWorks termina amanhã',
      body:
        'Seu período de teste para {{tenantName}} termina amanhã ({{expiryDate}}). Faça o upgrade agora. Após o término, você terá acesso limitado ao nível sandbox.',
    },
    expiration: {
      subject: 'Seu período de teste do CastorWorks terminou',
      body:
        'Seu período de teste para {{tenantName}} terminou. Você agora tem acesso limitado ao nível sandbox. Faça o upgrade a qualquer momento para recuperar o acesso completo.',
    },
  },
  'es-ES': {
    reminder_7d: {
      subject: 'Tu prueba de CastorWorks termina en 7 días',
      body:
        'Tu prueba para {{tenantName}} termina en 7 días ({{expiryDate}}). Actualiza ahora para mantener el acceso completo.',
    },
    reminder_3d: {
      subject: 'Tu prueba de CastorWorks termina en 3 días',
      body:
        'Tu prueba para {{tenantName}} termina en 3 días ({{expiryDate}}). No te lo pierdas — actualiza ahora para seguir usando CastorWorks sin interrupciones.',
    },
    reminder_1d: {
      subject: 'Tu prueba de CastorWorks termina mañana',
      body:
        'Tu prueba para {{tenantName}} termina mañana ({{expiryDate}}). Actualiza ahora. Después del vencimiento, tendrás acceso limitado al nivel sandbox.',
    },
    expiration: {
      subject: 'Tu prueba de CastorWorks ha terminado',
      body:
        'Tu prueba para {{tenantName}} ha terminado. Ahora tienes acceso limitado al nivel sandbox. Actualiza en cualquier momento para recuperar el acceso completo.',
    },
  },
  'fr-FR': {
    reminder_7d: {
      subject: 'Votre essai CastorWorks se termine dans 7 jours',
      body:
        'Votre essai pour {{tenantName}} se termine dans 7 jours ({{expiryDate}}). Passez à la version payante maintenant pour conserver l\'accès complet.',
    },
    reminder_3d: {
      subject: 'Votre essai CastorWorks se termine dans 3 jours',
      body:
        'Votre essai pour {{tenantName}} se termine dans 3 jours ({{expiryDate}}). Ne manquez pas — passez à la version payante pour continuer à utiliser CastorWorks.',
    },
    reminder_1d: {
      subject: 'Votre essai CastorWorks se termine demain',
      body:
        'Votre essai pour {{tenantName}} se termine demain ({{expiryDate}}). Passez à la version payante maintenant. Après expiration, vous aurez un accès limité au niveau sandbox.',
    },
    expiration: {
      subject: 'Votre essai CastorWorks est terminé',
      body:
        'Votre essai pour {{tenantName}} est terminé. Vous avez maintenant un accès limité au niveau sandbox. Passez à la version payante à tout moment pour retrouver l\'accès complet.',
    },
  },
};
