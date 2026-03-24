"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface PricingTier {
  nameKey: string
  descKey: string
  priceKey: string
  ctaKey: string
  featureKeys: string[]
  popular?: boolean
  custom?: boolean
}

const tiers: PricingTier[] = [
  {
    nameKey: "pricing.free.name",
    descKey: "pricing.free.desc",
    priceKey: "pricing.free.price",
    ctaKey: "pricing.cta.free",
    featureKeys: [
      "pricing.free.f1",
      "pricing.free.f2",
      "pricing.free.f3",
      "pricing.free.f4",
      "pricing.free.f5",
    ],
  },
  {
    nameKey: "pricing.starter.name",
    descKey: "pricing.starter.desc",
    priceKey: "pricing.starter.price",
    ctaKey: "pricing.cta.starter",
    featureKeys: [
      "pricing.starter.f1",
      "pricing.starter.f2",
      "pricing.starter.f3",
      "pricing.starter.f4",
      "pricing.starter.f5",
      "pricing.starter.f6",
      "pricing.starter.f7",
    ],
  },
  {
    nameKey: "pricing.architects.name",
    descKey: "pricing.architects.desc",
    priceKey: "pricing.architects.price",
    ctaKey: "pricing.cta.architects",
    popular: true,
    featureKeys: [
      "pricing.architects.f1",
      "pricing.architects.f2",
      "pricing.architects.f3",
      "pricing.architects.f4",
      "pricing.architects.f5",
      "pricing.architects.f6",
      "pricing.architects.f7",
      "pricing.architects.f8",
    ],
  },
  {
    nameKey: "pricing.construction.name",
    descKey: "pricing.construction.desc",
    priceKey: "pricing.construction.price",
    ctaKey: "pricing.cta.construction",
    custom: true,
    featureKeys: [
      "pricing.construction.f1",
      "pricing.construction.f2",
      "pricing.construction.f3",
      "pricing.construction.f4",
      "pricing.construction.f5",
      "pricing.construction.f6",
      "pricing.construction.f7",
      "pricing.construction.f8",
      "pricing.construction.f9",
    ],
  },
]

export function PricingSection() {
  const { t } = useLanguage()

  return (
    <section id="precos" className="py-24 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background mb-6">
            <span className="text-xs font-medium text-muted-foreground">
              {t("pricing.badge")}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance font-[family-name:var(--font-display)]">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </motion.div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.nameKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-8",
                tier.popular
                  ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary"
                  : "border-border"
              )}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {t("pricing.popular")}
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{t(tier.nameKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(tier.descKey)}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                {tier.custom ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{t("pricing.custom")}</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{t(tier.priceKey)}</span>
                    <span className="text-sm text-muted-foreground">{t("pricing.monthly")}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <Button
                className={cn(
                  "w-full mb-8 font-semibold",
                  tier.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    : tier.custom
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                )}
                asChild
              >
                <Link href="#demo">
                  {t(tier.ctaKey)}
                  {tier.popular && <ArrowRight className="ml-2 h-4 w-4" />}
                </Link>
              </Button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {tier.featureKeys.map((fKey) => (
                  <li key={fKey} className="flex items-start gap-3">
                    <Check className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      tier.popular ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="text-sm text-muted-foreground">{t(fKey)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
