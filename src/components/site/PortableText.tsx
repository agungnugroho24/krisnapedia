import type { PortableTextBlock } from "@/lib/content-types";
import { textValue } from "@/lib/content";

/**
 * Minimal Portable Text renderer — handles common block styles (h2/h3/p, lists,
 * marks like strong/em). Sufficient for our long-description and FAQ answer
 * fields without pulling in @portabletext/react.
 */
export function PortableText({
  value,
  className,
}: {
  value: PortableTextBlock[] | undefined | null;
  className?: string;
}) {
  if (!value?.length) return null;

  return (
    <div className={className}>
      {value.map((block, i) => {
        if (block._type !== "block") return null;
        const text = (block.children ?? []).map((child, ci) => {
          const marks = child.marks ?? [];
          let node: React.ReactNode = textValue(child.text);
          if (marks.includes("strong")) node = <strong key={ci}>{node}</strong>;
          if (marks.includes("em")) node = <em key={ci}>{node}</em>;
          return <span key={ci}>{node}</span>;
        });
        switch (block.style) {
          case "h2":
            return (
              <h2
                key={block._key ?? i}
                className="mt-6 font-display text-2xl font-bold text-foreground"
              >
                {text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={block._key ?? i}
                className="mt-5 font-display text-xl font-semibold text-foreground"
              >
                {text}
              </h3>
            );
          case "blockquote":
            return (
              <blockquote
                key={block._key ?? i}
                className="my-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground"
              >
                {text}
              </blockquote>
            );
          default:
            return (
              <p
                key={block._key ?? i}
                className="mt-3 leading-relaxed text-muted-foreground"
              >
                {text}
              </p>
            );
        }
      })}
    </div>
  );
}


