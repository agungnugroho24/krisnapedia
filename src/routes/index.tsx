import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { InsightHub } from "@/components/site/InsightHub";
import { ManualHub } from "@/components/site/ManualHub";
import { RegulationHub } from "@/components/site/RegulationHub";
import { WhatsNew } from "@/components/site/WhatsNew";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { viewsQueryOptions } from "@/lib/views-queries";
import { insightsQueryOptions, manualsQueryOptions, regulationsQueryOptions } from "@/lib/content-queries";
import { whatsNewQueryOptions } from "@/lib/whats-new";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(insightsQueryOptions());
    queryClient.prefetchQuery(manualsQueryOptions());
    queryClient.prefetchQuery(regulationsQueryOptions());
    queryClient.prefetchQuery(whatsNewQueryOptions({ limit: 4 }));
    queryClient.prefetchQuery(viewsQueryOptions("insight"));
    queryClient.prefetchQuery(viewsQueryOptions("manual"));
    queryClient.prefetchQuery(viewsQueryOptions("regulation"));
  },
  component: Index,
  head: () => ({
    meta: [
      { title: "KRISNApedia - Knowledge Management System" },
      {
        name: "description",
        content:
          "KRISNApedia centralizes documents, manuals, and insights into one searchable knowledge repository for modern teams.",
      },
      { property: "og:title", content: "KRISNApedia - Knowledge Management System" },
      {
        property: "og:description",
        content:
          "One repository for every answer. Centralize manuals, insights, and SOPs in a single platform.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <AntikorupsiPopup />
      <Navbar />
      <Hero />
      <InsightHub />
      <ManualHub />
      <RegulationHub />
      <WhatsNew />
      <Faq />
      <Footer />
    </main>
  );
}

function AntikorupsiPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = window.localStorage.getItem("krisnapedia:antikorupsi-popup-seen");
    if (!seen) {
      setOpen(true);
      window.localStorage.setItem("krisnapedia:antikorupsi-popup-seen", "1");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(1122px,calc(100vw-2rem))] overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Anti Korupsi</DialogTitle>
          <DialogDescription>Informasi antikorupsi untuk pengunjung beranda.</DialogDescription>
        </DialogHeader>
        <div className="relative bg-transparent">
          <div className="w-full bg-black/5">
            <img
              src="/antikorupsi.png"
              alt="Anti Korupsi"
              className="block h-auto w-full"
            />
          </div>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="absolute right-3 top-3 z-10 bg-background/90 backdrop-blur"
            >
              Tutup
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
