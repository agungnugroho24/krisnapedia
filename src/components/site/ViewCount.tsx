import { Eye } from "lucide-react";
import { formatCompactNumber } from "@/lib/format-number";

export function ViewCount({ count }: { count?: number }) {
  const value = formatCompactNumber(count ?? 0);
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${count ?? 0} views`}
      aria-label={`${count ?? 0} views`}
    >
      <Eye className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}
