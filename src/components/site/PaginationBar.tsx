import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Builds a compact page list with ellipsis: e.g. [1, "...", 4, 5, 6, "...", 10]
 * Always shows first, last, current, and current ± 1.
 */
function getPageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push("ellipsis");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("ellipsis");

  items.push(total);
  return items;
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const items = getPageItems(currentPage, totalPages);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  const handle = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <Pagination className={cn("mt-12", className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => handle(e, currentPage - 1)}
            aria-disabled={isFirst}
            className={cn(
              isFirst && "pointer-events-none opacity-40",
            )}
          />
        </PaginationItem>

        {items.map((it, idx) =>
          it === "ellipsis" ? (
            <PaginationItem key={`e-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={it}>
              <PaginationLink
                href="#"
                isActive={it === currentPage}
                onClick={(e) => handle(e, it)}
              >
                {it}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => handle(e, currentPage + 1)}
            aria-disabled={isLast}
            className={cn(
              isLast && "pointer-events-none opacity-40",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
