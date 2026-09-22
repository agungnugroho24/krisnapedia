/** Shared Sanity types for KRISNApedia content. */

export type SanityImage = {
  _type?: "image";
  asset?: { _ref?: string; _type?: string; url?: string };
};

export type SanityFile = {
  _type?: "file";
  asset?: { _ref?: string; _type?: string; url?: string; originalFilename?: string; size?: number };
};

export type PortableTextBlock = {
  _type?: string;
  _key?: string;
  children?: Array<{ _type?: string; text?: string; marks?: string[] }>;
  style?: string;
};

export type ViewerType = "pdf" | "slides" | "image" | "video" | "web";
export type FileTypeLabel =
  | "PDF"
  | "PPTX"
  | "DOCX"
  | "Web"
  | "Slides"
  | "Video"
  | "VIDEO"
  | "Image";

/** Common fields shared by Insight, Manual, Regulation. */
export type ContentBase = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  categoryId?: number;
  subCategory?: string;
  subCategoryId?: number;
  subSystem?: string;
  subSystemId?: number;
  year?: number;
  description: string;
  longDescription?: PortableTextBlock[];
  coverImage?: SanityImage;
  file?: SanityFile;
  coverPreviewUrl?: string;
  coverThumbnailUrl?: string;
  filePreviewUrl?: string;
  youtubeUrl?: string;
  videoDuration?: string;
  viewer: ViewerType;
  fileType?: FileTypeLabel;
  author?: string;
  date: string;
  pages?: number;
  fileSize?: string;
  language?: string;
  readTime?: string;
  tags?: string[];
  displayStatus?: string;
  status?: string;
  published?: boolean;
};

export type Insight = ContentBase;

export type Manual = ContentBase & {
  version?: string;
};

export type Regulation = ContentBase & {
  jurisdiction?: string;
  effectiveDate?: string;
  regulasiStatus?: string;
};

export type Faq = {
  _id: string;
  question: string;
  answer: PortableTextBlock[];
  category?: string;
  orderIndex?: number;
  published?: boolean;
};

