"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Brain, Zap, Target, TrendingUp } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const capabilityKeys = [
  { icon: Brain, key: "feature1" },
  { icon: Zap, key: "feature2" },
  { icon: Target, key: "feature3" },
  { icon: TrendingUp, key: "feature4" },
]

export function AISection() {
  const { t, language } = useLanguage()

  const aiCapabilities = capabilityKeys.map(({ icon, key }) => ({
    icon,
    title: t(`ai.${key}.title`),
    description: t(`ai.${key}.desc`),
  }))

  return (
    <section id="castormind" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent/8 via-primary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 mb-6">
              <Brain className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">{t("ai.badge")}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance font-[family-name:var(--font-display)]">
              {t("ai.title")}
            </h2>

            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              {t("ai.subtitle")}
            </p>

            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              {aiCapabilities.map((capability, index) => (
                <motion.div
                  key={capability.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted border border-border group-hover:border-primary/50 transition-colors">
                      <capability.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{capability.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{capability.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
              <Image
                src="/landing-assets/images/ai-brain-construction.jpg"
                alt={language === "pt-BR" ? "CastorMind-IA - Inteligência Artificial para Construção" : "CastorMind-AI - Artificial Intelligence for Construction"}
                width={600}
                height={500}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-wrap gap-3">
                  {[t("ai.capability1"), t("ai.capability2"), t("ai.capability3")].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-sm font-medium text-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
