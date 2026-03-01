import React from 'react'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

export default function AppReportPreview() {
  const { t } = useTranslation('app')

  return (
    <MobileAppLayout>
      <div className="px-5 py-6 space-y-6">
        {/* PDF Document Card */}
        <div className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
          {/* Hero Image Section */}
          <div 
            className="h-64 bg-slate-100 flex items-center justify-center relative bg-cover bg-center bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80')]"
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <div className="relative size-16 bg-white shadow-xl rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 !text-3xl">picture_as_pdf</span>
            </div>
          </div>

          {/* Report Content Preview */}
          <div className="p-8 space-y-8 bg-white text-slate-800">
            {/* Header Info */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">{t('reports.siteDailyLog', 'Site Daily Log')}</h2>
                <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">{t('reports.officialRecord', 'Official Project Record')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('reports.date', 'Log Date')}</p>
                <p className="text-sm font-bold text-slate-900">Oct 24, 2023</p>
              </div>
            </div>

            {/* Meta Stats */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.weather', 'Weather Conditions')}</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-500 !text-lg">wb_sunny</span>
                  <span className="text-sm font-bold">72°F / 22°C Clear</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.personnel', 'Field Personnel')}</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-700 !text-lg">groups</span>
                  <span className="text-sm font-bold">12 Total Staff</span>
                </div>
              </div>
            </div>

            {/* Summary Text */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.executiveSummary', 'Executive Summary')}</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Foundation inspection completed for Block A. Steel reinforcements verified according to architectural specs. Crane repositioning scheduled for 07:00 tomorrow.
              </p>
            </div>

            {/* Action Items */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('reports.criticalActions', 'Critical Action Items')}</p>
              {[
                'Verify window heights for Block B east wall',
                'Confirm concrete mix for upcoming pour',
                'Review site safety perimeter with new crew'
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="size-5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-amber-500 !text-[12px] font-black">check</span>
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Digital Signature */}
            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('reports.verifiedBy', 'Verified Digital Signature')}</p>
                <p className="text-sm font-black italic font-serif text-slate-900 underline decoration-amber-500/30 underline-offset-4">Alexandre Macedo</p>
              </div>
              <div className="size-16 rounded-full border-4 border-slate-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-200 !text-4xl">verified_user</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <section className="flex gap-4 pt-4">
          <button className="flex-1 h-14 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-all">
            <span className="material-symbols-outlined !text-xl">share</span>
            {t('common.share', 'Share')}
          </button>
          <button className="flex-[2] h-14 bg-amber-500 text-black rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[13px] shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
            <span className="material-symbols-outlined !text-xl">download</span>
            {t('reports.downloadPDF', 'Download PDF Report')}
          </button>
        </section>

        {/* Spacer for Bottom Nav */}
        <div className="h-10"></div>
      </div>
    </MobileAppLayout>
  )
}
