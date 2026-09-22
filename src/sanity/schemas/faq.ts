import { defineField, defineType } from "sanity";

export const faqSchema = defineType({
  name: "faq",
  type: "document",
  title: "FAQ",
  fields: [
    defineField({ name: "question", type: "string", validation: (R) => R.required().max(300) }),
    defineField({
      name: "answer",
      type: "array",
      of: [{ type: "block" }],
      validation: (R) => R.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      title: "Category (e.g. Umum, Akun, Konten)",
    }),
    defineField({
      name: "orderIndex",
      type: "number",
      title: "Display order",
      initialValue: 0,
    }),
    defineField({ name: "published", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "question", subtitle: "category" },
  },
});
