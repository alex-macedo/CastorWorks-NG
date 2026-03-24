"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/components/language-provider"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Globe className="h-4 w-4" />
        <span className="sr-only">Mudar idioma</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium">{language === "pt-BR" ? "PT" : "EN"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage("pt-BR")}
          className={language === "pt-BR" ? "bg-muted" : ""}
        >
          <span className="mr-2">🇧🇷</span>
          Português (BR)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage("en")}
          className={language === "en" ? "bg-muted" : ""}
        >
          <span className="mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
