"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { JoinWaitlistModal } from "@/components/landing/join-waitlist-modal"
import { ArrowRight, Zap, Lightbulb, Shield, Users } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function TestimonialSection() {
  const { t } = useLanguage()

  const reasons = [
    { icon: Zap, titleKey: "testimonials.reason1.title", descKey: "testimonials.reason1.desc" },
    { icon: Lightbulb, titleKey: "testimonials.reason2.title", descKey: "testimonials.reason2.desc" },
    { icon: Shield, titleKey: "testimonials.reason3.title", descKey: "testimonials.reason3.desc" },
    { icon: Users, titleKey: "testimonials.reason4.title", descKey: "testimonials.reason4.desc" },
  ]

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 mb-6">
            <span className="text-xs font-medium text-muted-foreground">
              {t("testimonials.badge")}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance font-[family-name:var(--font-display)]">
            {t("testimonials.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </motion.div>

        {/* Featured Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
            <div className="grid lg:grid-cols-2">
              <div className="relative h-64 lg:h-auto min-h-[320px]">
                <Image
                  src="/landing-assets/images/team-meeting.jpg"
                  alt=""
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-card" />
              </div>
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit mb-6">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {t("testimonials.featured.badge")}
                  </span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight text-balance font-[family-name:var(--font-display)]">
                  {t("testimonials.featured.title")}
                </h3>
                <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                  {t("testimonials.featured.desc")}
                </p>
                <div className="mt-8">
                  <JoinWaitlistModal source="testimonials-featured">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {t("testimonials.featured.cta")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </JoinWaitlistModal>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reasons Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="p-8 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors h-full">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <reason.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{t(reason.titleKey)}</h3>
                <p className="text-muted-foreground leading-relaxed">{t(reason.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
