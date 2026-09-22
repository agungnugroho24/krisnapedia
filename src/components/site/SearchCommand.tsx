import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, HelpCircle, Lightbulb, Scale } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchPalette } from "./SearchProvider";
import { searchAll } from "@/lib/search";
import {
  faqsQueryOptions,
  insightsQueryOptions,
  manualsQueryOptions,
  regulationsQueryOptions,
} from "@/lib/content-queries";

import { useT } from "@/i18n/LanguageProvider";

export function SearchCommand() {
  const { open, setOpen, initialQuery } = useSearchPalette();
  const { t } = useT();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Sync prefill when palette opens
  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  // Only fetch when palette is open (cache will keep results between opens)
  const insights = useQuery({ ...insightsQueryOptions(), enabled: open });
  const manuals = useQuery({ ...manualsQueryOptions(), enabled: open });
  const regulations = useQuery({ ...regulationsQueryOptions(), enabled: open });
  const faqs = useQuery({ ...faqsQueryOptions(), enabled: open });

  const insightHits = useMemo(
    () => searchAll(insights.data ?? [], query, 8),
    [insights.data, query],
  );
  const manualHits = useMemo(
    () => searchAll(manuals.data ?? [], query, 8),
    [manuals.data, query],
  );
  const regulationHits = useMemo(
    () => searchAll(regulations.data ?? [], query, 8),
    [regulations.data, query],
  );
  const faqHits = useMemo(
    () => searchAll(faqs.data ?? [], query, 8),
    [faqs.data, query],
  );

  const totalHits =
    insightHits.length + manualHits.length + regulationHits.length + faqHits.length;

  const isLoading =
    insights.isLoading || manuals.isLoading || regulations.isLoading || faqs.isLoading;

  const close = () => setOpen(false);

  const go = (to: "/insight-hub/$slug" | "/manual-hub/$slug" | "/pustaka-regulasi/$slug" | "/faq", slug?: string) => {
    close();
    if (slug) {
      navigate({ to, params: { slug } as any });
    } else {
      navigate({ to: to as "/faq" });
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t("search.placeholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() === "" ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("search.startTyping")}
            <div className="mt-2 text-xs opacity-70">
              {t("search.pressEsc")} <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Esc</kbd> {t("search.escHint")}
            </div>
          </div>
        ) : isLoading && totalHits === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("search.loading")}</div>
        ) : totalHits === 0 ? (
          <CommandEmpty>{t("search.noResults")} &ldquo;{query}&rdquo;.</CommandEmpty>
        ) : null}

        {insightHits.length > 0 && (
          <CommandGroup heading={t("search.group.insight")}>
            {insightHits.map((hit) => (
              <CommandItem
                key={hit._id}
                value={`insight-${hit._id}-${hit.title}`}
                onSelect={() => go("/insight-hub/$slug", hit.slug)}
              >
                <Lightbulb className="text-primary" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{hit.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.category}
                    {hit.fileType ? ` · ${hit.fileType}` : ""}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {manualHits.length > 0 && (
          <CommandGroup heading={t("search.group.manual")}>
            {manualHits.map((hit) => (
              <CommandItem
                key={hit._id}
                value={`manual-${hit._id}-${hit.title}`}
                onSelect={() => go("/manual-hub/$slug", hit.slug)}
              >
                <BookOpen className="text-primary" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{hit.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.category}
                    {hit.subCategory ? ` · ${hit.subCategory}` : ""}
                    {hit.fileType ? ` · ${hit.fileType}` : ""}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {regulationHits.length > 0 && (
          <CommandGroup heading={t("search.group.regulasi")}>
            {regulationHits.map((hit) => (
              <CommandItem
                key={hit._id}
                value={`reg-${hit._id}-${hit.title}`}
                onSelect={() => go("/pustaka-regulasi/$slug", hit.slug)}
              >
                <Scale className="text-primary" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{hit.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.category}
                    {hit.fileType ? ` · ${hit.fileType}` : ""}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {faqHits.length > 0 && (
          <CommandGroup heading={t("search.group.faq")}>
            {faqHits.map((hit) => (
              <CommandItem
                key={hit._id}
                value={`faq-${hit._id}-${hit.question}`}
                onSelect={() => go("/faq")}
              >
                <HelpCircle className="text-primary" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{hit.question}</span>
                  {hit.category && (
                    <span className="truncate text-xs text-muted-foreground">{hit.category}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
