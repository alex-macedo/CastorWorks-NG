"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, Star } from "lucide-react"
import { toast } from "sonner"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

interface JoinWaitlistModalProps {
  source: string
  children: React.ReactNode
}

interface JoinWaitlistResponse {
  success: boolean
  alreadyJoined?: boolean
  message?: string
}

interface WaitlistFormValues {
  fullName: string
  companyName: string
  email: string
  cellPhone: string
  moreInfoRequest: string
}

export function JoinWaitlistModal({ source, children }: JoinWaitlistModalProps) {
  const { t, language } = useLanguage()
  const [open, setOpen] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  const schema = React.useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(2, t("waitlist.validation.fullName")),
        companyName: z.string().trim().min(2, t("waitlist.validation.companyName")),
        email: z.string().trim().email(t("waitlist.validation.email")),
        cellPhone: z
          .string()
          .trim()
          .refine((value) => value.replace(/\D/g, "").length >= 8, t("waitlist.validation.cellPhone")),
        moreInfoRequest: z.string().trim().max(500).optional().or(z.literal("")),
      }),
    [t],
  )

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      cellPhone: "",
      moreInfoRequest: "",
    },
  })

  const resetState = React.useCallback(() => {
    form.reset()
    setIsSubmitted(false)
  }, [form])

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const onSubmit = async (values: WaitlistFormValues) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error(t("waitlist.toast.error"))
      form.setError("root", { message: t("waitlist.form.error") })
      return
    }

    form.clearErrors("root")

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/join-waiting-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          ...values,
          source,
          locale: language,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as JoinWaitlistResponse & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || t("waitlist.form.error"))
      }

      setIsSubmitted(true)
      toast.success(
        payload.alreadyJoined ? t("waitlist.toast.duplicate") : t("waitlist.toast.success"),
      )
    } catch (error) {
      console.error("[join-waitlist] submit failed", error)
      form.setError("root", { message: t("waitlist.form.error") })
      toast.error(t("waitlist.toast.error"))
    }
  }

  const highlights = [
    {
      icon: Sparkles,
      title: t("waitlist.card.priority"),
      description: t("waitlist.card.priorityDesc"),
    },
    {
      icon: Star,
      title: t("waitlist.card.guided"),
      description: t("waitlist.card.guidedDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("waitlist.card.updates"),
      description: t("waitlist.card.updatesDesc"),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950 p-0 text-white shadow-2xl sm:max-w-5xl"
      >
        <div className="relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:26px_26px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_45%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.14),transparent_38%)]" />

          <div className="relative grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
              <DialogHeader className="text-left">
                <div className="mb-5 inline-flex w-fit items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                  {t("waitlist.badge")}
                </div>
                <DialogTitle className="font-[family-name:var(--font-manrope)] text-4xl leading-tight text-white sm:text-5xl">
                  {t("waitlist.title")}
                </DialogTitle>
                <DialogDescription className="max-w-xl text-base leading-relaxed text-slate-300">
                  {t("waitlist.subtitle")}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 space-y-4">
                {highlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm leading-relaxed text-slate-400">{t("waitlist.trust")}</p>
            </div>

            <div className="p-8 lg:p-10">
              {isSubmitted ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-white">
                    {t("waitlist.form.successTitle")}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                    {t("waitlist.form.successDescription")}
                  </p>
                  <Button
                    type="button"
                    className="mt-8 h-11 rounded-full bg-white text-slate-950 hover:bg-slate-100"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("waitlist.form.successCta")}
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">{t("waitlist.form.fullName")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("waitlist.form.fullNamePlaceholder")}
                              className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">{t("waitlist.form.companyName")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("waitlist.form.companyNamePlaceholder")}
                              className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">{t("waitlist.form.email")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder={t("waitlist.form.emailPlaceholder")}
                                className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cellPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">{t("waitlist.form.cellPhone")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                inputMode="tel"
                                placeholder={t("waitlist.form.cellPhonePlaceholder")}
                                className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="moreInfoRequest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">
                            {t("waitlist.form.moreInfoRequest")}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={4}
                              placeholder={t("waitlist.form.moreInfoRequestPlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.formState.errors.root ? (
                      <p className="text-sm text-rose-300">{form.formState.errors.root.message}</p>
                    ) : null}

                    <Button
                      type="submit"
                      size="lg"
                      className="mt-2 h-12 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("waitlist.form.submitting")}
                        </>
                      ) : (
                        t("waitlist.form.submit")
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
