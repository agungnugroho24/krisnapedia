import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, MessageCircleQuestion, Send, Mail, User, Tag, Loader2, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PaginationBar } from "@/components/site/PaginationBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { z } from "zod";
import { faqsQueryOptions } from "@/lib/content-queries";
import { fetchFaqCaptcha, submitFaqInquiry, type FaqCaptchaChallenge } from "@/lib/content.functions";
import { useT } from "@/i18n/LanguageProvider";
import { PortableText } from "@/components/site/PortableText";
import { blocksToPlainText } from "@/lib/content";
import captchaAnalyticsImage from "@/assets/insight-analytics.jpg";
import captchaMarketImage from "@/assets/insight-market.jpg";
import captchaStrategyImage from "@/assets/insight-strategy.jpg";
import captchaRegulasiUuImage from "@/assets/regulasi-uu.jpg";
import captchaRegulasiPerpresImage from "@/assets/regulasi-perpres.jpg";

const CAPTCHA_IMAGES: Record<string, string> = {
  analytics: captchaAnalyticsImage,
  market: captchaMarketImage,
  strategy: captchaStrategyImage,
  "regulasi-uu": captchaRegulasiUuImage,
  "regulasi-perpres": captchaRegulasiPerpresImage,
};

export const Route = createFileRoute("/faq")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(faqsQueryOptions());
  },
  pendingComponent: FaqLoading,
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "Klinik KRISNA - FAQ KRISNApedia" },
      {
        name: "description",
        content: "Klinik KRISNA adalah pusat tanya jawab KRISNApedia.",
      },
    ],
  }),
});

function FaqLoading() {
  const { t } = useT();
  return (
    <main className="flex min-h-[40vh] items-center justify-center bg-background px-4 py-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {t("common.loading")}
      </div>
    </main>
  );
}

const createInquirySchema = (t: ReturnType<typeof useT>["t"]) => z.object({
  nama: z.string().trim().min(2, t("faq.page.validation.nameMin")).max(100),
  email: z.string().trim().email(t("faq.page.validation.emailInvalid")).max(255),
  subjek: z.string().trim().min(3, t("faq.page.validation.subjectMin")).max(150),
  pertanyaan: z.string().trim().min(10, t("faq.page.validation.questionMin")).max(1000),
});

function FaqPage() {
  const { t } = useT();
  const inquirySchema = useMemo(() => createInquirySchema(t), [t]);
  const { data: faqs } = useSuspenseQuery(faqsQueryOptions());
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ nama: "", email: "", subjek: "", pertanyaan: "" });
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<FaqCaptchaChallenge | null>(null);
  const [captchaX, setCaptchaX] = useState(0);
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<typeof form | null>(null);
  const namaInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 8;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = t("faq.page.metaTitle");
    const meta = document.querySelector("meta[name=\"description\"]") as HTMLMetaElement | null;
    if (meta) meta.content = t("faq.page.metaDescription");
  }, [t]);

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const challenge = await fetchFaqCaptcha();
      setCaptcha(challenge);
      setCaptchaX(0);
      setCaptchaSolved(false);
    } catch (error) {
      console.error("fetchFaqCaptcha failed", error);
      toast.error("Gagal memuat verifikasi puzzle.");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    void loadCaptcha();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs;
    const q = query.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        blocksToPlainText(f.answer).toLowerCase().includes(q),
    );
  }, [faqs, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // Reset to page 1 when query changes
  const handleQueryChange = (v: string) => {
    setQuery(v);
    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = inquirySchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? t("common.formInvalid"));
      return;
    }
    if (!captcha || !captchaSolved) {
      toast.error("Selesaikan puzzle verifikasi terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFaqInquiry({
        data: {
          ...result.data,
          captcha_id: captcha.id,
          captcha_x: captchaX,
        },
      });
      setSubmittedData(result.data);
      setSuccessOpen(true);
      setForm({ nama: "", email: "", subjek: "", pertanyaan: "" });
      await loadCaptcha();
    } catch (error) {
      console.error("submitFaqInquiry failed", error);
      toast.error(t("common.sendFailed"));
      await loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setSuccessOpen(false);
    setTimeout(() => namaInputRef.current?.focus(), 100);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-[var(--primary-soft)] px-4 py-1.5">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("faq.page.brand")} 
            </span>
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {t("faq.page.heroTitlePrefix")} <span className="text-primary">{t("faq.page.brand")}</span> {t("faq.page.heroTitleSuffix")} 
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("faq.page.heroLead")}
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <Label htmlFor="faq-search" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("faq.page.searchLabel")}
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="faq-search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder={t("faq.page.searchPlaceholder")}
                className="h-12 pl-9"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("faq.page.resultsPrefix")} <strong className="text-foreground">{filtered.length}</strong> {t("common.resultsOf")} {faqs.length} {t("faq.page.resultsSuffix")}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("faq.page.sectionTitle")}
          </h2>
          <div className="mt-8">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
                <p className="font-display text-lg font-semibold text-foreground">
                  {t("faq.page.empty")}
                </p>
              </div>
            ) : (
              <>
                <Accordion type="single" collapsible className="w-full">
                  {paginated.map((f, i) => (
                    <AccordionItem key={f._id} value={`item-${i}`} className="border-b border-border">
                      <AccordionTrigger className="py-5 text-left font-display text-base font-semibold text-foreground hover:text-primary hover:no-underline md:text-lg">
                        {f.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground md:text-base">
                        <PortableText value={f.answer} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <PaginationBar
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(p) => {
                    setPage(p);
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("faq.page.askLabel")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("faq.page.askTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("faq.page.askLead")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-1">
                <Label htmlFor="nama" className="text-sm font-semibold">{t("faq.page.form.name")}</Label>
                <div className="relative mt-2">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input ref={namaInputRef} id="nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder={t("faq.page.form.namePlaceholder")} className="h-11 pl-9" maxLength={100} required />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="email" className="text-sm font-semibold">{t("faq.page.form.email")}</Label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("faq.page.form.emailPlaceholder")} className="h-11 pl-9" maxLength={255} required />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="subjek" className="text-sm font-semibold">{t("faq.page.form.subject")}</Label>
                <div className="relative mt-2">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="subjek" value={form.subjek} onChange={(e) => setForm({ ...form, subjek: e.target.value })} placeholder={t("faq.page.form.subjectPlaceholder")} className="h-11 pl-9" maxLength={150} required />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="pertanyaan" className="text-sm font-semibold">{t("faq.page.form.question")}</Label>
                <Textarea id="pertanyaan" value={form.pertanyaan} onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })} placeholder={t("faq.page.form.questionPlaceholder")} className="mt-2 min-h-[140px] resize-none" maxLength={1000} required />
              </div>
              <div className="md:col-span-2">
                <JigsawCaptcha
                  challenge={captcha}
                  value={captchaX}
                  loading={captchaLoading}
                  solved={captchaSolved}
                  onChange={(value) => {
                    setCaptchaX(value);
                    setCaptchaSolved(Boolean(captcha) && Math.abs(value - captcha.target_x) <= 8);
                  }}
                  onRefresh={loadCaptcha}
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting || captchaLoading || !captchaSolved} className="mt-6 h-11 w-full gap-2 md:w-auto md:px-8">
              <Send className="h-4 w-4" />
              {submitting ? t("faq.page.loading") : t("faq.page.form.submit")}
            </Button>
          </form>
        </div>
      </section>

      <Footer />

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)]">
              <CheckCircle2 className="h-9 w-9 text-primary" strokeWidth={2.2} />
            </div>
            <DialogTitle className="font-display text-2xl">{t("faq.page.successTitle")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("faq.page.successDesc")}
            </DialogDescription>
          </DialogHeader>

          {submittedData && (
            <div className="mt-2 space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
              <div className="flex gap-2">
                <span className="w-20 shrink-0 font-semibold text-muted-foreground">{t("faq.page.resultLabelName")}</span>
                <span className="text-foreground">{submittedData.nama}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-20 shrink-0 font-semibold text-muted-foreground">{t("faq.page.resultLabelEmail")}</span>
                <span className="break-all text-foreground">{submittedData.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-20 shrink-0 font-semibold text-muted-foreground">{t("faq.page.resultLabelSubject")}</span>
                <span className="text-foreground">{submittedData.subjek}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-20 shrink-0 font-semibold text-muted-foreground">{t("faq.page.resultLabelQuestion")}</span>
                <span className="text-foreground">
                  {submittedData.pertanyaan.length > 200
                    ? `${submittedData.pertanyaan.slice(0, 200)}`
                    : submittedData.pertanyaan}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setSuccessOpen(false)}>
              {t("faq.page.close")}
            </Button>
            <Button onClick={handleSendAnother}>{t("faq.page.another")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>

  );
}

function JigsawCaptcha({
  challenge,
  value,
  loading,
  solved,
  onChange,
  onRefresh,
}: {
  challenge: FaqCaptchaChallenge | null;
  value: number;
  loading: boolean;
  solved: boolean;
  onChange: (value: number) => void;
  onRefresh: () => void;
}) {
  const width = challenge?.width ?? 300;
  const targetX = challenge?.target_x ?? 150;
  const image = CAPTCHA_IMAGES[challenge?.image_key ?? ""] ?? captchaAnalyticsImage;
  const pieceSize = 42;
  const max = width - pieceSize;
  const clampedValue = Math.min(Math.max(value, 0), max);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="faq-captcha-slider" className="text-sm font-semibold">
          Verifikasi puzzle
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8 gap-2 px-2">
          <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background p-3">
        <div
          className="relative mx-auto h-[118px] overflow-hidden rounded-md"
          style={{
            width,
            backgroundImage: `linear-gradient(oklch(0 0 0 / 0.08), oklch(0 0 0 / 0.08)), url(${image})`,
            backgroundPosition: "center",
            backgroundSize: `${width}px 118px`,
          }}
        >
          <div
            className="absolute top-[38px] h-[42px] w-[42px] rounded-md border-2 border-dashed border-background/95 bg-background/35 shadow-inner backdrop-blur-[1px]"
            style={{ left: targetX }}
          />
          <div
            className={`absolute top-[38px] flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-md border border-background/80 text-primary-foreground shadow-lg transition-colors ${solved ? "ring-2 ring-green-500 ring-offset-2 ring-offset-background" : ""}`}
            style={{
              left: clampedValue,
              backgroundImage: `url(${image})`,
              backgroundPosition: `calc(50% - ${clampedValue}px) center`,
              backgroundSize: `${width}px 118px`,
            }}
          >
            {solved ? <ShieldCheck className="h-5 w-5 rounded-full bg-green-600 p-0.5" /> : null}
          </div>
        </div>
        <input
          id="faq-captcha-slider"
          type="range"
          min={0}
          max={max}
          value={clampedValue}
          disabled={!challenge || loading || solved}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mx-auto mt-3 block accent-[var(--primary)]"
          style={{ width }}
          aria-label="Geser potongan puzzle sampai tepat di area kosong"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {solved ? "Puzzle cocok. Pertanyaan siap dikirim." : "Geser potongan sampai pas dengan area kosong sebelum mengirim."}
      </p>
    </div>
  );
}
