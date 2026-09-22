import { useQuery } from "@tanstack/react-query";
import { FileText, Layers, Clock } from "lucide-react";
import {
  insightsQueryOptions,
  manualsQueryOptions,
  regulationsQueryOptions,
} from "@/lib/content-queries";
import { formatRelative } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/LanguageProvider";

type StatPillProps = {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  loading?: boolean;
};

function StatPill({ icon, value, label, loading }: StatPillProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-[var(--shadow-soft)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="flex flex-col text-left">
        {loading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <span className="font-display text-lg font-bold leading-tight text-foreground">
            {value}
          </span>
        )}
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

export function HeroStats() {
  const { lang, t } = useT();
  const insights = useQuery(insightsQueryOptions());
  const manuals = useQuery(manualsQueryOptions());
  const regulations = useQuery(regulationsQueryOptions());

  const isLoading =
    insights.isLoading || manuals.isLoading || regulations.isLoading;

  const all = [
    ...(insights.data ?? []),
    ...(manuals.data ?? []),
    ...(regulations.data ?? []),
  ];

  const totalDocs = all.length;

  const categorySet = new Set(
    all.map((d) => d.category).filter((c): c is string => Boolean(c)),
  );
  const totalCategories = categorySet.size;

  const latestDate = all
    .map((d) => d.date)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.localeCompare(a))[0];
  const updatedLabel = latestDate ? formatRelative(latestDate, lang) : "-";

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <StatPill
        icon={<FileText className="h-4 w-4" />}
        value={totalDocs}
        label={t("stats.docs")}
        loading={isLoading}
      />
      <StatPill
        icon={<Layers className="h-4 w-4" />}
        value={totalCategories}
        label={t("stats.categories")}
        loading={isLoading}
      />
      <StatPill
        icon={<Clock className="h-4 w-4" />}
        value={updatedLabel}
        label={t("stats.updated")}
        loading={isLoading}
      />
    </div>
  );
}


