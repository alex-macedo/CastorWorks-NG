"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { JoinWaitlistModal } from "@/components/landing/join-waitlist-modal"
import { ArrowRight, CheckCircle2, Rocket, ShieldCheck, Headphones } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function CTASection() {
  const { t } = useLanguage()

  const benefits = [t("cta.benefit1"), t("cta.benefit2"), t("cta.benefit3")]

  const highlights = [
    { icon: Rocket, titleKey: "cta.highlight1.title", descKey: "cta.highlight1.desc" },
    { icon: ShieldCheck, titleKey: "cta.highlight2.title", descKey: "cta.highlight2.desc" },
    { icon: Headphones, titleKey: "cta.highlight3.title", descKey: "cta.highlight3.desc" },
  ]

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/landing-assets/images/finished-home.jpg"
          alt=""
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance font-[family-name:var(--font-display)]">
              {t("cta.title")}
            </h2>
            
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("cta.subtitle")}
            </p>

            <ul className="mt-8 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <JoinWaitlistModal source="bottom-cta-primary">
                <Button 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-14 text-base shadow-lg shadow-primary/20"
                >
                  {t("cta.button")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </JoinWaitlistModal>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground">
              {t("cta.note")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative rounded-2xl bg-card/80 backdrop-blur-sm border border-border p-8 space-y-6">
              {highlights.map((item, i) => (
                <motion.div
                  key={item.titleKey}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/50"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t(item.titleKey)}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(item.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
