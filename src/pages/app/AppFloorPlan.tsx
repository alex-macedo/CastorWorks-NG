import React from 'react'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

export default function AppFloorPlan() {
  const { t } = useTranslation('app')

  return (
    <MobileAppLayout fullImmersion customHeader={false} disableMainScroll>
      <div className="flex-1 relative h-full w-full min-w-0 overflow-hidden bg-[#0d1418] flex flex-col animate-in fade-in duration-500">
        {/* Layer Filters */}
        <div className="absolute top-4 left-0 right-0 z-20 flex gap-3 px-4 overflow-x-auto no-scrollbar">
          <div className="h-10 px-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center gap-2 text-amber-500 font-bold text-sm backdrop-blur-md">
            <span className="material-symbols-outlined !text-lg fill-1">push_pin</span>
            {t('floorPlan.pinsOn', 'Pins On')}
          </div>
          <div className="h-10 px-5 rounded-full bg-black/50 border border-white/10 flex items-center gap-2 text-white font-medium text-sm backdrop-blur-md">
            <span className="material-symbols-outlined !text-lg">bolt</span>
            {t('floorPlan.electrical', 'Electrical')}
          </div>
          <div className="h-10 px-5 rounded-full bg-black/50 border border-white/10 flex items-center gap-2 text-white font-medium text-sm backdrop-blur-md">
            <span className="material-symbols-outlined !text-lg">water_drop</span>
            {t('floorPlan.plumbing', 'Plumbing')}
          </div>
        </div>

        {/* Floor Plan Rendering Mockup */}
        <div className="flex-1 w-full bg-cover bg-center flex items-center justify-center p-4">
          <div 
            className="relative w-full aspect-[4/3] bg-slate-800/20 border border-white/5 rounded-2xl bg-cover bg-center shadow-2xl" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80')" } as React.CSSProperties}
          >
             <button 
               className="absolute top-[30%] left-[25%] size-8 bg-amber-500 rounded-full rounded-bl-none rotate-45 border-2 border-slate-900 flex items-center justify-center shadow-lg"
               title="Pin 1"
             >
              <span className="text-slate-900 text-xs font-bold -rotate-45">1</span>
            </button>
            <button 
              className="absolute top-[55%] left-[65%] size-10 bg-amber-500 rounded-full rounded-bl-none rotate-45 border-2 border-white flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]"
              title="Pin 2"
            >
              <span className="text-slate-900 text-sm font-black -rotate-45">2</span>
            </button>
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <div className="flex flex-col bg-black/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl">
            <button className="size-12 flex items-center justify-center border-b border-white/10"><span className="material-symbols-outlined">add</span></button>
            <button className="size-12 flex items-center justify-center"><span className="material-symbols-outlined">remove</span></button>
          </div>
          <button className="size-12 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-xl"><span className="material-symbols-outlined font-bold">add_location_alt</span></button>
          <button className="size-12 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">navigation</span></button>
        </div>

        {/* Pin Details Bottom Sheet Mockup */}
        <div className="absolute bottom-4 left-4 right-4 bg-[#0B1114] border border-white/10 rounded-3xl p-6 shadow-2xl z-30">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-2 mb-6"></div>
          <div className="flex items-center gap-4 mb-6">
            <div className="size-12 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 font-black text-xl shrink-0">2</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold tracking-tight">Window Alignment Issue</h3>
              <p className="text-xs text-white/40 font-medium">Kitchen East Wall</p>
            </div>
            <button className="text-white/40"><span className="material-symbols-outlined">more_horiz</span></button>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-sm font-bold">architecture</span>
                <span className="text-sm font-semibold">Lead Architect</span>
              </div>
              <span className="text-[10px] text-white/40">Oct 24, 10:45 AM</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">The structural beam on the east wall seems to conflict with the specified window height. Need to verify clearance.</p>
          </div>
          <div className="mt-6 flex gap-3">
            <div className="flex-1 h-12 bg-white/5 border border-white/10 rounded-full flex items-center px-5 text-white/40 text-sm">Add a response...</div>
            <button className="size-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">send</span></button>
          </div>
          <button className="w-full mt-6 h-12 bg-white/10 rounded-xl font-bold flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all">
            <span className="material-symbols-outlined !text-sm">check_circle</span>
            {t('floorPlan.markResolved', 'Mark as Resolved')}
          </button>
        </div>
      </div>
    </MobileAppLayout>
  )
}
