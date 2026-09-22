import { createFileRoute } from "@tanstack/react-router";
import { CustomStudio } from "@/components/admin/CustomStudio";

export const Route = createFileRoute("/studio/")({
  ssr: false,
  component: CustomStudioPage,
  head: () => ({
    meta: [
      { title: "KRISNApedia Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function CustomStudioPage() {
  return <CustomStudio />;
}
