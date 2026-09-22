import { cn } from "@/lib/utils";

type DisplayStatusBadgeProps = {
  status?: string | null;
  className?: string;
};

function resolveStatus(status?: string | null) {
  const normalized = status?.trim();
  if (!normalized) return "";
  if (normalized.toLowerCase() === "aktif") return "";
  return normalized;
}

export function DisplayStatusBadge({ status, className }: DisplayStatusBadgeProps) {
  const label = resolveStatus(status);
  if (!label) return null;

  return (
    <span
      className={cn(
        "absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur ring-1 ring-inset ring-border",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
      {label}
    </span>
  );
}