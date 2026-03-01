import React from 'react'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

export default function AppBuilder() {
  const { t } = useTranslation('app')

  return (
    <MobileAppLayout>
      <div className="px-5 py-6 space-y-10">
        <header className="px-1">
          <h2 className="text-3xl font-bold tracking-tight mb-2">{t('builder.title', 'Project Architect')}</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{t('builder.subtitle', 'Configure project scope and structural definitions.')}</p>
        </header>

        <section className="bg-[#121A1E] border border-white/5 rounded-3xl p-6 space-y-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em]">{t('builder.structure', 'Primary Structure')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <button className="h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-start px-4 gap-3 text-white">
                <span className="material-symbols-outlined text-amber-500">home</span>
                <span className="text-sm font-bold">{t('builder.residential', 'Residential')}</span>
              </button>
              <button className="h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-start px-4 gap-3 text-slate-500">
                <span className="material-symbols-outlined">apartment</span>
                <span className="text-sm font-bold">{t('builder.commercial', 'Commercial')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">{t('builder.scope', 'Scope of Works')}</h4>
            <div className="space-y-3">
              {['Foundation & Earthworks', 'Structural Framing', 'Interior Fit-out', 'Landscape'].map((scope) => (
                <div key={scope} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <span className="text-sm font-bold text-white">{scope}</span>
                  <div className="size-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-500 !text-sm">check</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-2 pb-10">
          <button className="w-full h-15 bg-white text-black font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest">
            {t('builder.generate', 'Generate Project Logic')}
          </button>
        </section>
      </div>
    </MobileAppLayout>
  )
}
