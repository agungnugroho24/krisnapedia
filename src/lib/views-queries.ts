import { queryOptions } from "@tanstack/react-query";
import { getViewsMap } from "@/lib/views.functions";

export type ContentType = "insight" | "manual" | "regulation";

export const viewsQueryOptions = (type: ContentType) =>
  queryOptions({
    queryKey: ["views", type],
    queryFn: async (): Promise<Record<string, number>> =>
      getViewsMap({ data: { type } }),
    staleTime: 30_000,
  });
