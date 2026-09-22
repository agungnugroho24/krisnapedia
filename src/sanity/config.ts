import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemas";
import { SANITY_DATASET, SANITY_PROJECT_ID } from "@/lib/content";

/**
 * Embedded Sanity Studio config — mounted at /studio in the Lovable app.
 * Editors log in with their Sanity account (must be invited via
 * sanity.io/manage/project/l6d1o9wo → Members).
 */
export const studioConfig = defineConfig({
  name: "krisnapedia",
  title: "KRISNApedia Admin",
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
