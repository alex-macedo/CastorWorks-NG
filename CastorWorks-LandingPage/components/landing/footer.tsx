"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

export function Footer() {
  const { t, language } = useLanguage()

  const footerLinks = {
    platform: [
      { label: language === "pt-BR" ? "Funcionalidades" : "Features", href: "#plataforma" },
      { label: language === "pt-BR" ? "CastorMind-IA" : "CastorMind-AI", href: "#castormind" },
    ],
  }

  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image
                src="/landing-assets/brand/castorworks-logo.png"
                alt="CastorWorks logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-md object-cover"
              />
              <span className="text-lg font-semibold text-foreground">
                CastorWorks
              </span>
            </Link>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">{t("footer.platform")}</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CastorWorks Tecnologia Ltda. {t("footer.rights")}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === "pt-BR" ? "Feito no Brasil" : "Made in Brazil"}
          </p>
        </div>
      </div>
    </footer>
  )
}
