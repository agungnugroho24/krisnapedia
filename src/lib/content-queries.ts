import { queryOptions } from "@tanstack/react-query";
import {
  fetchFaqs,
  fetchInsightBySlug,
  fetchInsights,
  fetchManualBySlug,
  fetchManuals,
  fetchRegulationBySlug,
  fetchRegulations,
} from "./content.functions";
import type { Faq, Insight, Manual, Regulation } from "./content-types";
import { normalizeContent, normalizeFaq } from "./content";

export const insightsQueryOptions = () =>
  queryOptions({
    queryKey: ["insights"],
    queryFn: async (): Promise<Insight[]> => (await fetchInsights()).map(normalizeContent),
    staleTime: 60_000,
  });

export const insightBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["insight", slug],
    queryFn: async (): Promise<Insight | null> => {
      const insight = await fetchInsightBySlug({ data: slug });
      return insight ? normalizeContent(insight) : null;
    },
    staleTime: 60_000,
  });

export const manualsQueryOptions = () =>
  queryOptions({
    queryKey: ["manuals"],
    queryFn: async (): Promise<Manual[]> => (await fetchManuals()).map(normalizeContent),
    staleTime: 60_000,
  });

export const manualBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["manual", slug],
    queryFn: async (): Promise<Manual | null> => {
      const manual = await fetchManualBySlug({ data: slug });
      return manual ? normalizeContent(manual) : null;
    },
    staleTime: 60_000,
  });

export const regulationsQueryOptions = () =>
  queryOptions({
    queryKey: ["regulations"],
    queryFn: async (): Promise<Regulation[]> => (await fetchRegulations()).map(normalizeContent),
    staleTime: 60_000,
  });

export const regulationBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["regulation", slug],
    queryFn: async (): Promise<Regulation | null> => {
      const regulation = await fetchRegulationBySlug({ data: slug });
      return regulation ? normalizeContent(regulation) : null;
    },
    staleTime: 60_000,
  });

export const faqsQueryOptions = () =>
  queryOptions({
    queryKey: ["faqs"],
    queryFn: async (): Promise<Faq[]> => (await fetchFaqs()).map(normalizeFaq),
    staleTime: 60_000,
  });
