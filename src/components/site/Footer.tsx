import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Send } from "lucide-react";
import logoLight from "@/assets/logo-light.svg";
import logoDark from "@/assets/logo-dark.svg";
import { useT } from "@/i18n/LanguageProvider";

export function Footer() {
  const { t } = useT();

  const cols: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
    {
      title: t("footer.menuTitle"),
      links: [
        { label: t("nav.regulasi"), to: "/pustaka-regulasi" },
        { label: t("nav.insight"), to: "/insight-hub" },
        { label: t("nav.manual"), to: "/manual-hub" },
      ],
    },
    {
      title: t("footer.supportTitle"),
      links: [
        { label: t("footer.faq"), to: "/faq" },
        { label: t("footer.about"), to: "/tentang" },
        { label: t("footer.guide"), to: "/panduan" },
        { label: t("footer.contact"), href: "mailto:krisna@bappenas.go.id" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface-warm">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center">
              <img src={logoLight} alt="KRISNApedia" className="block h-10 w-auto dark:hidden" />
              <img src={logoDark} alt="KRISNApedia" className="hidden h-10 w-auto dark:block" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                {
                  icon: Instagram,
                  href: "https://www.instagram.com/krisna_systems/",
                  label: "Instagram",
                  external: true,
                },
                {
                  icon: Youtube,
                  href: "https://www.youtube.com/@SistemInformasiKRISNA",
                  label: "YouTube",
                  external: true,
                },
                {
                  icon: Send,
                  href: "#",
                  label: "Telegram",
                  external: false,
                },
              ].map(({ icon: Icon, href, label, external }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link
                        to={l.to}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            {t("footer.rights")}
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
          </div>
        </div>
      </div>
    </footer>
  );
}
