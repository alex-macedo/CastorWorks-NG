import React from 'react'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

export default function AppMeetingReview() {
  const { t } = useTranslation('app')

  return (
    <MobileAppLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Meeting Header Info */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Kitchen Remodel - Sync</h1>
          <p className="text-[13px] text-slate-500 font-medium">October 24, 2023 • 45 min duration</p>
        </div>

        {/* Extraction Progress Card */}
        <div className="bg-[#1C2A31]/50 border border-white/5 rounded-2xl p-5 space-y-3.5">
          <div className="flex justify-between items-center">
            <span className="text-[15px] font-bold text-slate-200">{t('meetingReview.progress', 'Extraction Progress')}</span>
            <span className="text-[14px] font-black text-amber-500">5/12 Items</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)]" style={{ width: '41.6%' }}></div>
            <div className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)] w-[41.6%]"></div>
          </div>
        </div>

        {/* Potential Decisions Section */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 px-1">
            <span className="material-symbols-outlined text-amber-500 !text-[20px] font-black">gavel</span>
            <h3 className="text-[16px] font-bold tracking-tight">{t('meetingReview.decisions', 'Potential Decisions')}</h3>
          </div>

          <div className="space-y-5">
            {/* Decision Card 1 */}
            <div className="bg-[#162025] border border-white/5 rounded-[24px] overflow-hidden shadow-2xl transition-transform active:scale-[0.99]">
              <div 
                className="aspect-[16/8] bg-cover bg-center bg-[url('https://images.unsplash.com/photo-1556911223-0534c27bd08f?w=600&q=80')]" 
              />
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">Material Selection</span>
                  <h4 className="text-[17px] font-bold leading-tight">Client approved Marble for the kitchen island</h4>
                </div>
                
                <div className="bg-[#0B1114]/60 border-l-2 border-amber-500 rounded-r-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-slate-500 !text-[14px]">format_quote</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Transcript Context</span>
                  </div>
                  <p className="text-[13px] text-slate-300 italic leading-relaxed">
                    "...looking at the options, let's definitely go with the Carrara Marble for the island. It matches the backsplash perfectly."
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="size-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all">
                    <span className="material-symbols-outlined !text-[20px]">edit</span>
                  </button>
                  <button className="size-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all">
                    <span className="material-symbols-outlined !text-[20px]">delete</span>
                  </button>
                  <button className="flex-1 h-11 bg-amber-500 text-white font-black text-[13px] uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                    {t('meetingReview.confirm', 'Confirm Decision')}
                  </button>
                </div>
              </div>
            </div>

            {/* Decision Card 2 */}
            <div className="bg-[#162025] border border-white/5 rounded-[24px] p-5 space-y-4 shadow-xl">
              <h4 className="text-[17px] font-bold leading-tight">Project completion date set for Dec 15th</h4>
              
              <div className="bg-[#0B1114]/60 border-l-2 border-amber-500 rounded-r-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-slate-500 !text-[14px]">format_quote</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Transcript Context</span>
                </div>
                <p className="text-[13px] text-slate-300 italic leading-relaxed">
                  "If we start the flooring next week, we are looking at a hard wrap-up by December 15th before the holidays."
                </p>
              </div>

              <div className="flex gap-3">
                <button className="size-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all">
                  <span className="material-symbols-outlined !text-[20px]">edit</span>
                </button>
                <button className="size-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all">
                  <span className="material-symbols-outlined !text-[20px]">delete</span>
                </button>
                <button className="flex-1 h-11 bg-amber-500 text-white font-black text-[13px] uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                  {t('meetingReview.confirm', 'Confirm Decision')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Key Facts Section */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <span className="material-symbols-outlined text-amber-500 !text-[22px] fill-1">info</span>
            <h3 className="text-[16px] font-bold tracking-tight">{t('meetingReview.facts', 'Key Facts')}</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-[#162025] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Logistics</span>
                <p className="text-[14px] font-bold text-slate-200 mt-0.5">Client away on vacation Oct 12-19</p>
              </div>
              <div className="flex gap-2.5">
                <button className="size-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined !text-[18px]">close</span>
                </button>
                <button className="size-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
                  <span className="material-symbols-outlined !text-[18px] font-black">check</span>
                </button>
              </div>
            </div>

            <div className="bg-[#162025] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Finance</span>
                <p className="text-[14px] font-bold text-slate-200 mt-0.5">Budget increased by 15% for premium lighting</p>
              </div>
              <div className="flex gap-2.5">
                <button className="size-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined !text-[18px]">close</span>
                </button>
                <button className="size-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
                  <span className="material-symbols-outlined !text-[18px] font-black">check</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Global Action Bar */}
        <section className="flex gap-4 pt-4 pb-10">
          <button className="flex-1 h-14 bg-white/5 border border-white/10 text-white font-bold text-[15px] rounded-2xl active:scale-95 transition-transform hover:bg-white/10">
            {t('meetingReview.dismissAll', 'Dismiss All')}
          </button>
          <button className="flex-[2] h-14 bg-amber-500 text-white font-black text-[15px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-amber-500/20 active:scale-95 transition-transform">
            {t('meetingReview.submit', 'Submit to Project')}
          </button>
        </section>
      </div>
    </MobileAppLayout>
  )
}
