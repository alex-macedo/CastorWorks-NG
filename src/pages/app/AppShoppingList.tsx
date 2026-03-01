import React from 'react'
import { useTranslation } from 'react-i18next'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'

export default function AppShoppingList() {
  const { t } = useTranslation('app')

  const products = [
    { name: 'Linear Pendants', vendor: 'Muuto Design', price: '$420', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&q=80' },
    { name: 'Walnut Shell Chair', vendor: 'Carl Hansen', price: '$1,290', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80' },
    { name: 'Linen Curtains', vendor: 'Kvadrat', price: '$850', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80' },
    { name: 'Marble Coffee Table', vendor: 'Menu Space', price: '$3,400', image: 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=400&q=80' }
  ]

  return (
    <MobileAppLayout>
      <div className="px-5 py-6 space-y-10">
        <section>
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden text-white">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-2">{t('shopping.budget', 'Project Budget')}</p>
              <h3 className="text-3xl font-bold tracking-tighter">$245,000</h3>
              <div className="mt-6 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[65%] bg-amber-500"></div>
              </div>
              <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-widest">{t('shopping.spent', '65% of procurement budget utilized')}</p>
            </div>
            <span className="material-symbols-outlined absolute -right-6 -bottom-6 !text-[120px] text-amber-500/10 rotate-12">shopping_bag</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold tracking-tight">{t('shopping.byRoom', 'Shop by Room')}</h3>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t('common.seeAll', 'See All')}</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
            {['Kitchen', 'Living', 'Master Suite', 'Outdoor'].map((room) => (
              <div key={room} className="h-24 min-w-[140px] bg-[#121A1E] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 group hover:border-amber-500/30 transition-all">
                <span className="material-symbols-outlined text-slate-600 group-hover:text-amber-500">deck</span>
                <span className="text-xs font-bold">{room}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight px-1">{t('shopping.vendors', 'Curated Vendors')}</h3>
          <div className="grid grid-cols-2 gap-4">
            {['Herman Miller', 'Poliform', 'B&B Italia', 'Cassina'].map((v) => (
              <div key={v} className="bg-[#121A1E] border border-white/5 rounded-2xl p-4 flex items-center justify-center h-16 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
                <span className="text-sm font-black uppercase tracking-[0.2em]">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight px-1">{t('shopping.products', 'Product Grid')}</h3>
          <div className="grid grid-cols-2 gap-4">
            {products.map((p) => (
              <div key={p.name} className="bg-[#121A1E] border border-white/5 rounded-3xl overflow-hidden group hover:border-amber-500/20 transition-all">
                <div className="h-40 bg-slate-900 relative">
                  <img src={p.image} className="w-full h-full object-cover" alt="" />
                  <button className="absolute top-3 right-3 size-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-all">
                    <span className="material-symbols-outlined !text-xl">favorite</span>
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{p.vendor}</p>
                  <h4 className="font-bold text-sm tracking-tight mb-3 truncate">{p.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 font-black tracking-tight">{p.price}</span>
                    <button className="size-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 active:scale-95 transition-all">
                      <span className="material-symbols-outlined !text-[18px]">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        <div className="h-10"></div>
      </div>
    </MobileAppLayout>
  )
}
