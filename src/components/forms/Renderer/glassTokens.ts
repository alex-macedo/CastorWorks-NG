type ThemeKey = 'light' | 'darkGold';

type ThemeTokens = {
  backdrop: string;
  header: string;
  footer: string;
  card: string;
  cardHover: string;
  progressTrack: string;
  progressBar: string;
  cta: string;
  textPrimary: string;
  textSecondary: string;
  accentGradient: string;
};

export const glassThemes: Record<ThemeKey, ThemeTokens> = {
  light: {
    backdrop: 'bg-[radial-gradient(circle_at_20%_20%,#e2e8f0_0%,#f8fafc_45%,#ffffff_100%)]',
    header:
      'bg-white/70 backdrop-blur-md border-b border-slate-200/70 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]',
    footer:
      'bg-white/70 backdrop-blur-sm border-t border-slate-200/70 shadow-[0_-6px_18px_-16px_rgba(15,23,42,0.3)]',
    card:
      'rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]',
    cardHover:
      'hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)] focus-within:ring-2 focus-within:ring-[#F97316]/20 focus-within:border-[#F97316]/60',
    progressTrack: 'bg-slate-200 rounded-full overflow-hidden',
    progressBar: 'bg-[#F97316]',
    cta:
      'rounded-full shadow-[0_12px_30px_-14px_rgba(249,115,22,0.55)] bg-[#F97316] hover:bg-[#ea6a12] text-white',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    accentGradient: 'bg-gradient-to-r from-[#F97316] via-[#fbbf24] to-[#F97316]',
  },
  darkGold: {
    backdrop: 'bg-[radial-gradient(circle_at_25%_20%,#0f172a_0%,#0b1220_40%,#050810_100%)]',
    header:
      'bg-[#0b1220]/80 backdrop-blur-md border-b border-[#1f2937] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]',
    footer:
      'bg-[#0b1220]/80 backdrop-blur-sm border-t border-[#1f2937] shadow-[0_-6px_18px_-16px_rgba(0,0,0,0.7)]',
    card:
      'rounded-2xl border border-[#1f2937] bg-[#0f172a]/75 backdrop-blur-md shadow-[0_14px_40px_-20px_rgba(0,0,0,0.7)]',
    cardHover:
      'hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)] focus-within:ring-2 focus-within:ring-[#f5b301]/25 focus-within:border-[#f5b301]/60',
    progressTrack: 'bg-[#111827] rounded-full overflow-hidden',
    progressBar: 'bg-[#f5b301]',
    cta:
      'rounded-full shadow-[0_14px_34px_-16px_rgba(245,179,1,0.65)] bg-[#f5b301] hover:bg-[#e3a800] text-[#0b0f19]',
    textPrimary: 'text-slate-50',
    textSecondary: 'text-slate-200',
    accentGradient: 'bg-gradient-to-r from-[#f5b301] via-[#fbd149] to-[#f5b301]',
  },
};

export type FormThemeVariant = ThemeKey;

export const getFormTheme = (variant: FormThemeVariant = 'light') =>
  glassThemes[variant] || glassThemes.light;
