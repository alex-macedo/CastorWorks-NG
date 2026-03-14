import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: 'CastorWorks | Inteligência Artificial para Construção Civil',
  description: 'Plataforma com IA que automatiza orçamentos, cronogramas e gestão financeira de obras. Potencializada por CastorMind-IA.',
  generator: 'CastorWorks',
  icons: {
    icon: '/landing-assets/icons/favicon.ico',
    shortcut: '/landing-assets/icons/favicon.ico',
    apple: '/landing-assets/brand/castorworks-logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${_inter.variable} ${_manrope.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme="light">
          <LanguageProvider>
            {children}
            <Toaster richColors position="top-center" />
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
