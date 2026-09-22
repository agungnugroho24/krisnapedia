import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  fetchViewsMap,
  rpcIncrementView,
  shouldThrottle,
  type ContentType,
} from "./views.server";

const TYPE = z.enum(["insight", "manual", "regulation"]);
const SLUG = z.string().min(1).max(200).regex(/^[a-z0-9-_]+$/i);
const CONTENT_ID = z.string().min(1).max(200);

const incrementSchema = z.object({
  type: TYPE,
  slug: SLUG,
  contentId: CONTENT_ID,
});

export const incrementView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => incrementSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const key = `${ip}:${data.type}:${data.slug}`;
    if (shouldThrottle(key)) {
      return { ok: true, throttled: true as const };
    }
    try {
      const views = await rpcIncrementView(data);
      return { ok: true, throttled: false as const, views };
    } catch (err) {
      console.error("incrementView failed", err);
      return { ok: false, throttled: false as const, views: 0 };
    }
  });

const viewsMapSchema = z.object({ type: TYPE });

export const getViewsMap = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => viewsMapSchema.parse(input))
  .handler(async ({ data }): Promise<Record<string, number>> => {
    try {
      return await fetchViewsMap(data.type as ContentType);
    } catch (err) {
      console.error("getViewsMap failed", err);
      return {};
    }
  });
