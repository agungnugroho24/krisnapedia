import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Info,
  BookOpen,
  Lightbulb,
  FileText,
  MessageCircleQuestion,
  Building2,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LanguageProvider";
import logoLight from "@/assets/logo-light.svg";
import logoDark from "@/assets/logo-dark.svg";

export const Route = createFileRoute("/tentang")({
  component: TentangPage,
  head: () => ({
    meta: [
      { title: "Tentang KRISNApedia — Pusat Pengetahuan KRISNA" },
      {
        name: "description",
        content:
          "KRISNApedia adalah platform manajemen pengetahuan yang menghimpun regulasi, panduan, dan materi pembelajaran KRISNA dalam satu portal.",
      },
      { property: "og:title", content: "Tentang KRISNApedia" },
      {
        property: "og:description",
        content:
          "Pusat pengetahuan KRISNA — regulasi, panduan, dan materi pembelajaran dalam satu portal.",
      },
    ],
  }),
});

function TentangPage() {
  const { t } = useT();

  const ecosystem = [
    {
      icon: FileText,
      title: t("about.eco.regulasi.title"),
      desc: t("about.eco.regulasi.desc"),
      to: "/pustaka-regulasi",
    },
    {
      icon: Lightbulb,
      title: t("about.eco.insight.title"),
      desc: t("about.eco.insight.desc"),
      to: "/insight-hub",
    },
    {
      icon: BookOpen,
      title: t("about.eco.manual.title"),
      desc: t("about.eco.manual.desc"),
      to: "/manual-hub",
    },
    {
      icon: MessageCircleQuestion,
      title: t("about.eco.klinik.title"),
      desc: t("about.eco.klinik.desc"),
      to: "/faq",
    },
  ] as const;

  const audiences = [
    { icon: Building2, title: t("about.audience.kl.title"), desc: t("about.audience.kl.desc") },
    { icon: MapPin, title: t("about.audience.pemda.title"), desc: t("about.audience.pemda.desc") },
    { icon: Users, title: t("about.audience.publik.title"), desc: t("about.audience.publik.desc") },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-[var(--primary-soft)] px-4 py-1.5">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("about.badge")}
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {t("about.heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("about.heroLead")}
          </p>
        </div>
      </section>

      {/* What is KRISNApedia */}
      <section className="border-b border-border bg-background py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("about.whatTitle")}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {t("about.whatBody1")}
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {t("about.whatBody2")}
            </p>
          </div>
          <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-12 shadow-[var(--shadow-soft)]">
            <img src={logoLight} alt="KRISNApedia" className="block h-24 w-auto dark:hidden" />
            <img src={logoDark} alt="KRISNApedia" className="hidden h-24 w-auto dark:block" />
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-b border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("about.ecoEyebrow")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("about.ecoTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("about.ecoLead")}</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ecosystem.map((m) => (
              <Link
                key={m.title}
                to={m.to}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                  <m.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                  {m.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {m.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {t("about.openModule")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="border-b border-border bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("about.audienceEyebrow")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("about.audienceTitle")}
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {audiences.map((a) => (
              <div
                key={a.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                  <a.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-start gap-6 rounded-3xl border border-border bg-[var(--gradient-hero)] p-10 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("about.ctaTitle")}
              </h3>
              <p className="mt-3 text-muted-foreground">{t("about.ctaLead")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/insight-hub">
                  {t("about.ctaPrimary")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/faq">{t("about.ctaSecondary")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
