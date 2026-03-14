"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useLanguage } from "@/components/language-provider"

export function SegmentsSection() {
  const { t, language } = useLanguage()

  const segments = [
    {
      titleKey: "segments.builders.title",
      descKey: "segments.builders.desc",
      image: "/landing-assets/images/construction-site.jpg",
      features: language === "pt-BR" 
        ? ["Gestão multi-obras", "BDI configurável", "Integração SINAPI"]
        : ["Multi-project management", "Configurable BDI", "SINAPI integration"],
    },
    {
      titleKey: "segments.architects.title",
      descKey: "segments.architects.desc",
      image: "/landing-assets/images/architect-office.jpg",
      features: language === "pt-BR" 
        ? ["Especificações técnicas", "Cronograma visual", "Portal do cliente"]
        : ["Technical specifications", "Visual scheduling", "Client portal"],
    },
    {
      titleKey: "segments.managers.title",
      descKey: "segments.managers.desc",
      image: "/landing-assets/images/site-manager.jpg",
      features: language === "pt-BR" 
        ? ["Diário de obra", "Modo offline", "Relatórios de campo"]
        : ["Site diary", "Offline mode", "Field reports"],
    },
    {
      titleKey: "segments.clients.title",
      descKey: "segments.clients.desc",
      image: "/landing-assets/images/happy-homeowner.jpg",
      features: language === "pt-BR" 
        ? ["Acompanhamento em tempo real", "Galeria de fotos", "Extrato financeiro"]
        : ["Real-time tracking", "Photo gallery", "Financial statement"],
    },
  ]

  return (
    <section id="segmentos" className="py-24 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background mb-6">
            <span className="text-xs font-medium text-muted-foreground">
              {t("segments.badge")}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance font-[family-name:var(--font-display)]">
            {t("segments.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("segments.subtitle")}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={segment.image || "/landing-assets/placeholder.svg"}
                  alt={t(segment.titleKey)}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>
              
              <div className="p-6 -mt-8 relative">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t(segment.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {t(segment.descKey)}
                </p>
                
                <ul className="space-y-2 mb-4">
                  {segment.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
