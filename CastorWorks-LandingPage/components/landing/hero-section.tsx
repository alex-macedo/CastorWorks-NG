"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { JoinWaitlistModal } from "@/components/landing/join-waitlist-modal"
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { useLanguage } from "@/components/language-provider"

export function HeroSection() {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  
  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/landing-assets/images/hero-bg.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/60" />
      </div>

      <div className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              style={{ opacity }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {t("hero.badge")}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.08] tracking-tight font-[family-name:var(--font-display)]">
                {t("hero.title")}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-primary">
                  {t("hero.titleHighlight")}
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t("hero.subtitle")}
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <JoinWaitlistModal source="hero-primary">
                  <Button 
                    size="lg" 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-14 text-base shadow-lg shadow-primary/20"
                  >
                    {t("hero.cta")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </JoinWaitlistModal>
              </div>

              <div className="mt-12 pt-8 border-t border-border/40">
                <p className="text-sm font-medium text-muted-foreground mb-4">{t("hero.trusted")}</p>
                <div className="flex flex-col gap-3">
                  {[t("hero.stat1"), t("hero.stat2"), t("hero.stat3")].map((stat, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{stat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            
            {/* Right Column - Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ y }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-border/50 ring-1 ring-white/5">
                  <Image
                    src="/landing-assets/images/dashboard-ui.jpg"
                    alt="CastorWorks Dashboard"
                    width={700}
                    height={450}
                    className="w-full h-auto"
                  />
                </div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="absolute -bottom-6 -left-8 w-28 rounded-2xl overflow-hidden shadow-xl border border-border/50 ring-1 ring-white/5"
                >
                  <Image
                    src="/landing-assets/images/mobile-app.jpg"
                    alt="CastorWorks Mobile"
                    width={112}
                    height={224}
                    className="w-full h-auto"
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="absolute -top-4 -right-4 bg-card/95 backdrop-blur-md rounded-xl p-3.5 shadow-lg border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{t("hero.badge")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("hero.aiReady")}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
