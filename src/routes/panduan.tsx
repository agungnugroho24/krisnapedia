import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookMarked,
  Search,
  Download,
  MessageCircleQuestion,
  FileText,
  Lightbulb,
  BookOpen,
  Command,
  SlidersHorizontal,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/panduan")({
  component: PanduanPage,
  head: () => ({
    meta: [
      { title: "Panduan Penggunaan — KRISNApedia" },
      {
        name: "description",
        content:
          "Panduan singkat untuk memulai dan memaksimalkan penggunaan KRISNApedia: pencarian, modul, tips, dan dukungan.",
      },
      { property: "og:title", content: "Panduan Penggunaan KRISNApedia" },
      {
        property: "og:description",
        content: "Pelajari cara menelusuri, membaca, dan memanfaatkan KRISNApedia.",
      },
    ],
  }),
});

function PanduanPage() {
  const { t } = useT();

  const quick = [
    { icon: Search, title: t("guide.quick.s1.title"), desc: t("guide.quick.s1.desc") },
    { icon: Download, title: t("guide.quick.s2.title"), desc: t("guide.quick.s2.desc") },
    {
      icon: MessageCircleQuestion,
      title: t("guide.quick.s3.title"),
      desc: t("guide.quick.s3.desc"),
    },
  ];

  const modules = [
    {
      icon: FileText,
      title: t("guide.mod.regulasi.title"),
      to: "/pustaka-regulasi",
      steps: [
        t("guide.mod.regulasi.s1"),
        t("guide.mod.regulasi.s2"),
        t("guide.mod.regulasi.s3"),
      ],
    },
    {
      icon: Lightbulb,
      title: t("guide.mod.insight.title"),
      to: "/insight-hub",
      steps: [t("guide.mod.insight.s1"), t("guide.mod.insight.s2"), t("guide.mod.insight.s3")],
    },
    {
      icon: BookOpen,
      title: t("guide.mod.manual.title"),
      to: "/manual-hub",
      steps: [t("guide.mod.manual.s1"), t("guide.mod.manual.s2"), t("guide.mod.manual.s3")],
    },
    {
      icon: MessageCircleQuestion,
      title: t("guide.mod.klinik.title"),
      to: "/faq",
      steps: [t("guide.mod.klinik.s1"), t("guide.mod.klinik.s2"), t("guide.mod.klinik.s3")],
    },
  ] as const;

  const tips = [
    { icon: Command, title: t("guide.tip.search.title"), desc: t("guide.tip.search.desc") },
    {
      icon: SlidersHorizontal,
      title: t("guide.tip.filter.title"),
      desc: t("guide.tip.filter.desc"),
    },
    { icon: Globe, title: t("guide.tip.lang.title"), desc: t("guide.tip.lang.desc") },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-[var(--primary-soft)] px-4 py-1.5">
            <BookMarked className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("guide.badge")}
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {t("guide.heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("guide.heroLead")}
          </p>
        </div>
      </section>

      {/* Quickstart */}
      <section className="border-b border-border bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("guide.quickEyebrow")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("guide.quickTitle")}
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {quick.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-5xl font-bold text-primary/20">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules zigzag */}
      <section className="border-b border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("guide.modulesEyebrow")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("guide.modulesTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("guide.modulesLead")}</p>
          </div>

          <div className="mt-12 space-y-8">
            {modules.map((m, i) => (
              <div
                key={m.title}
                className={`grid gap-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:grid-cols-2 md:items-center md:p-10 ${
                  i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                    <m.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-bold text-foreground">
                    {m.title}
                  </h3>
                  <Button asChild variant="outline" size="sm" className="mt-5 gap-2">
                    <Link to={m.to}>
                      {t("guide.openModule")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <ol className="space-y-3">
                  {m.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="border-b border-border bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("guide.tipsEyebrow")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("guide.tipsTitle")}
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tips.map((tip) => (
              <div
                key={tip.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                  <tip.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-base font-semibold text-foreground">
                  {tip.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help CTA */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-start gap-6 rounded-3xl border border-border bg-[var(--gradient-hero)] p-10 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("guide.helpTitle")}
              </h3>
              <p className="mt-3 text-muted-foreground">{t("guide.helpLead")}</p>
            </div>
            <Button asChild size="lg" className="gap-2">
              <Link to="/faq">
                {t("guide.helpCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
