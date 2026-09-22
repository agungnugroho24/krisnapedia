import { defineField, defineType } from "sanity";

export const manualSchema = defineType({
  name: "manual",
  type: "document",
  title: "Manual",
  fields: [
    defineField({ name: "title", type: "string", validation: (R) => R.required().max(200) }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "category",
      type: "reference",
      to: [{ type: "category" }],
      title: "Category",
      validation: (R) => R.required(),
    }),
    defineField({ name: "subCategory", type: "string" }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      validation: (R) => R.required().max(300),
    }),
    defineField({ name: "longDescription", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "coverImage", type: "image", options: { hotspot: true } }),
    defineField({
      name: "file",
      type: "file",
      title: "Document file (PDF, PPTX, DOCX, image)",
    }),
    defineField({
      name: "youtubeUrl",
      type: "url",
      title: "YouTube URL (for video content)",
    }),
    defineField({
      name: "viewer",
      type: "string",
      title: "Viewer type",
      options: {
        list: [
          { title: "PDF", value: "pdf" },
          { title: "Slides", value: "slides" },
          { title: "Image", value: "image" },
          { title: "Video", value: "video" },
          { title: "Web article", value: "web" },
        ],
        layout: "radio",
      },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "fileType",
      type: "string",
      title: "File type label",
      options: { list: ["PDF", "PPTX", "DOCX", "Web", "Slides", "Video", "Image"] },
    }),
    defineField({ name: "author", type: "string" }),
    defineField({ name: "date", type: "date", validation: (R) => R.required() }),
    defineField({ name: "version", type: "string", title: 'Version (e.g. "v2.4")' }),
    defineField({ name: "pages", type: "number" }),
    defineField({ name: "fileSize", type: "string" }),
    defineField({ name: "language", type: "string", initialValue: "Bahasa Indonesia" }),
    defineField({ name: "readTime", type: "string" }),
    defineField({
      name: "tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "status",
      type: "string",
      options: { list: ["Aktif", "Aktif Terbaru", "Arsip"] },
      initialValue: "Aktif",
    }),
    defineField({ name: "published", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "title", subtitle: "category.title", media: "coverImage" },
  },
});
