"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { 
  FileSpreadsheet, 
  Calendar, 
  Wallet, 
  ClipboardCheck, 
  Users, 
  ShoppingCart,
  Smartphone,
  BarChart3,
  ArrowRight
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { JoinWaitlistModal } from "@/components/landing/join-waitlist-modal"

const featureKeys = [
  { icon: FileSpreadsheet, key: "budget", highlight: "IA" },
  { icon: Calendar, key: "schedule", highlight: "IA" },
  { icon: Wallet, key: "financial" },
  { icon: ClipboardCheck, key: "diary" },
  { icon: Users, key: "portal" },
  { icon: ShoppingCart, key: "procurement" },
  { icon: Smartphone, key: "mobile" },
  { icon: BarChart3, key: "reports" },
]

export function FeaturesSection() {
  const { t } = useLanguage()

  const features = featureKeys.map(({ icon, key, highlight }) => ({
    icon,
    title: t(`features.${key}.title`),
    description: t(`features.${key}.desc`),
    highlight,
  }))

  return (
    <section id="plataforma" className="py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 mb-6">
            <span className="text-xs font-medium text-muted-foreground">
              {t("features.badge")}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance font-[family-name:var(--font-display)]">
            {t("features.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </motion.div>

        {/* Feature Highlight with Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 via-muted to-blue-500/10 p-1">
            <div className="relative rounded-[22px] overflow-hidden bg-card">
              <div className="grid lg:grid-cols-2 gap-8 items-center p-8 lg:p-12">
                <div>
                  <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
                    {t("ai.badge")}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 font-[family-name:var(--font-display)]">
                    {features[0].title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {features[0].description}
                  </p>
                  <JoinWaitlistModal source="features-highlight">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </JoinWaitlistModal>
                </div>
                <div className="relative">
                  <Image
                    src="/landing-assets/images/dashboard-ui.jpg"
                    alt="Dashboard Preview"
                    width={600}
                    height={400}
                    className="rounded-xl shadow-2xl border border-border/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.slice(1).map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group relative p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              {feature.highlight && (
                <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {feature.highlight}
                </span>
              )}
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <feature.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
