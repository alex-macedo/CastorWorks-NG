"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/components/language-provider"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useLanguage()

  const navLinks = [
    { label: t("nav.platform"), href: "#plataforma" },
    { label: t("nav.ai"), href: "#castormind" },
    { label: t("nav.segments"), href: "#segmentos" },
  ]

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/landing-assets/brand/castorworks-logo.png"
            alt="CastorWorks logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-md object-cover"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            CastorWorks
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="https://devng.castorworks.cloud/login">{t("nav.login")}</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-muted-foreground"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t("nav.language")}</span>
                  <LanguageToggle />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t("nav.theme")}</span>
                  <ThemeToggle />
                </div>
                <Button variant="outline" className="w-full bg-transparent" size="sm" asChild>
                  <Link href="https://devng.castorworks.cloud/login">{t("nav.login")}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
