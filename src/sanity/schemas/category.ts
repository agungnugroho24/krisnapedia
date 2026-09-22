import { defineField, defineType } from "sanity";

export const categorySchema = defineType({
  name: "category",
  type: "document",
  title: "Category",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Name",
      validation: (R) => R.required().max(100),
    }),
  ],
  preview: {
    select: { title: "title" },
  },
});
