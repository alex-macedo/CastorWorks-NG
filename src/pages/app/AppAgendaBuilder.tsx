import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

interface AgendaItem {
  id: string
  title: string
  time: string
  user: string
}

export default function AppAgendaBuilder() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()

  const [items] = useState<AgendaItem[]>([
    { id: '1', title: 'Review Floor Plan Annotations', time: '15m', user: 'Alex Rivers' },
    { id: '2', title: 'Cost Saving: Material Swaps', time: '10m', user: 'Sarah Chen' },
    { id: '3', title: 'Budget Realignment & Approval', time: '20m', user: 'Marcus Wu' }
  ])

  const categories = [
    { label: 'Cost Savings', icon: 'lightbulb' },
    { label: 'Floor Plans', icon: 'architecture' },
    { label: 'Open Tasks', icon: 'checklist' }
  ]

  return (
    <MobileAppLayout>
      <div className="px-5 py-6 space-y-8">
        <header className="px-1">
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">{t('agenda.title', 'Meeting Agenda')}</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{t('agenda.subtitle', 'Add items from project logs to build today\'s session.')}</p>
        </header>
        
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button key={cat.label} className="h-10 px-5 rounded-full bg-[#1A252B] border border-white/5 flex items-center gap-2.5 shrink-0 hover:bg-[#232F36] transition-colors active:scale-95 text-white">
              <span className="material-symbols-outlined text-amber-500 !text-[20px]">{cat.icon}</span>
              <span className="text-[13px] font-bold tracking-tight">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-[#121A1E] border border-white/5 rounded-2xl p-5 flex items-center gap-4 group transition-all hover:border-amber-500/20 shadow-sm relative overflow-hidden">
              <span className="material-symbols-outlined text-slate-700">drag_indicator</span>
              <div className="flex-1">
                <h4 className="font-bold text-[15px] mb-2 leading-tight text-white">{item.title}</h4>
                <div className="flex items-center gap-3">
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2.5 py-1 rounded-md font-black tracking-wider uppercase">
                    {item.time}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined !text-[14px]">person</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest leading-none">{item.user}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 text-slate-600 hover:text-white transition-colors">
                <span className="material-symbols-outlined !text-[22px]">edit</span>
              </button>
            </div>
          ))}
          
          <div className="border-2 border-dashed border-white/5 rounded-2xl py-10 flex flex-col items-center justify-center bg-black/20">
            <span className="material-symbols-outlined text-slate-700 !text-3xl mb-2">add</span>
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] px-4 text-center">{t('agenda.dropHint', 'Drop items here to add to agenda')}</p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-4 pb-10">
          <button 
            onClick={() => navigate('/app/meeting')}
            className="w-full h-15 bg-amber-500 text-white font-black rounded-2xl shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)] flex items-center justify-center gap-3 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[13px]"
          >
            <span className="material-symbols-outlined !text-[26px]">play_circle</span>
            {t('agenda.startWithAI', 'Start Meeting with AI')}
          </button>
        </div>
      </div>
    </MobileAppLayout>
  )
}
