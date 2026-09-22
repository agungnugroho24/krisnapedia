import { toast } from "sonner";

type ShareInput = {
  title: string;
  text?: string;
  url?: string;
};

export async function shareCurrentPage({ title, text, url }: ShareInput) {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  const shareUrl = url ?? window.location.href;
  const shareData = { title, text, url: shareUrl };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link berhasil disalin");
  } catch {
    toast.error("Gagal membagikan link");
  }
}
