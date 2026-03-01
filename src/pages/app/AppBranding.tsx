import React from 'react'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

export default function AppBranding() {
  const { t } = useTranslation('app')

  return (
    <MobileAppLayout>
      <div className="px-5 py-6 space-y-10">
        <section>
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em] mb-4 px-1">{t('branding.preview', 'Report Header Preview')}</h3>
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl border border-white/10 group active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="size-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3 overflow-hidden border border-amber-500/20">
                  <span className="material-symbols-outlined text-slate-800 font-bold">architecture</span>
                </div>
                <p className="text-slate-900 text-base font-bold tracking-tight">Vanguard Architects</p>
                <p className="text-slate-500 text-[11px] leading-relaxed max-w-[160px] font-medium">88 Design District, Suite 400<br/>San Francisco, CA 94103</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="w-16 h-1.5 bg-amber-500 mb-4 rounded-full"></div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none mb-1.5">Project Log Report</p>
                <p className="text-slate-900 text-[13px] font-black tracking-tight">Project #2024-012</p>
              </div>
            </div>
          </div>
          <p className="text-slate-600 text-[11px] mt-4 text-center font-medium italic underline decoration-slate-800 underline-offset-4">{t('branding.hint', 'This is how your firm branding appears on PDF exports.')}</p>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold tracking-tight px-1">{t('branding.identity', 'Visual Identity')}</h3>
          <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-white/5 bg-white/5 px-6 py-10 hover:bg-white/10 transition-colors group">
            <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
              <span className="material-symbols-outlined text-slate-500 group-hover:text-amber-500 text-4xl">image</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-white font-bold">{t('branding.logo', 'Firm Logo')}</p>
              <p className="text-slate-500 text-[11px] font-medium text-center">{t('branding.logoDesc', 'Recommended: PNG or SVG (min 400x400px)')}</p>
            </div>
            <button className="bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest h-11 px-8 rounded-xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
              {t('branding.changeLogo', 'Change Logo')}
            </button>
          </div>

          <div className="space-y-3 px-1">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('branding.firmName', 'Firm Name')}</p>
            <input 
              className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-5 text-white font-bold text-sm focus:ring-1 focus:ring-amber-500/30 transition-all outline-none" 
              defaultValue="Vanguard Architects"
              title={t('branding.firmName', 'Firm Name')}
            />
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold tracking-tight px-1">{t('branding.location', 'Office Address')}</h3>
          <textarea 
            className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 text-white font-medium text-sm h-36 focus:ring-1 focus:ring-amber-500/30 transition-all outline-none resize-none leading-relaxed" 
            defaultValue={"88 Design District, Suite 400\nSan Francisco, CA 94103"} 
            title={t('branding.location', 'Office Address')}
          />
        </section>

        <section className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl group hover:border-amber-500/20 transition-all">
          <div>
            <p className="text-white font-bold text-sm">{t('branding.seal', 'Include Professional Seal')}</p>
            <p className="text-slate-500 text-[11px] font-medium mt-0.5">{t('branding.sealDesc', 'Digitally sign architectural logs')}</p>
          </div>
          <button 
            className="w-12 h-6 bg-amber-500 rounded-full relative transition-colors"
            aria-label={t('branding.seal', 'Include Professional Seal')}
          >
            <div className="absolute right-1 top-1 size-4 bg-white rounded-full"></div>
          </button>
        </section>

        <section className="pt-4 pb-10">
          <button className="w-full h-15 bg-white text-black font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-2xl active:scale-95 transition-all">
            {t('branding.saveAll', 'Save All Changes')}
          </button>
        </section>
      </div>
    </MobileAppLayout>
  )
}
