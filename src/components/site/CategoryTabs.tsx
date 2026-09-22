import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LanguageProvider";

type TabItem = string | { value: string; label: string };

type CategoryTabsProps = {
  items: TabItem[];
  active: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  variant?: "primary" | "secondary";
  className?: string;
};

/**
 * Horizontal pill-style tab list. Used twice on Manual Hub:
 * once for the main category, once for the sub-category.
 */
export function CategoryTabs({
  items,
  active,
  onChange,
  ariaLabel,
  variant = "primary",
  className,
}: CategoryTabsProps) {
  const { t } = useT();
  if (items.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const value = typeof item === "string" ? item : item.value;
        const label = typeof item === "string" ? item : item.label;
        const isActive = value === active;
        const renderedLabel = value === "All" ? t("tabs.all") : label;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all",
              variant === "primary" ? "h-10" : "h-9 text-[13px]",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {renderedLabel}
          </button>
        );
      })}
    </div>
  );
}
