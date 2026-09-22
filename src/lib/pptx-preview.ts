export type PptxSlidePreview = {
  index: number;
  title: string;
  text: string;
};

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;

function readUInt16LE(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUInt32LE(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8").decode(bytes);
}

function decodeXmlEntities(text: string) {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function extractSlideText(xml: string) {
  const matches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) =>
    decodeXmlEntities(match[1].trim()),
  );

  return matches.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const minOffset = Math.max(0, bytes.length - 0x10000 - 22);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32LE(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }
  return -1;
}

function parseZipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) {
    throw new Error("PPTX zip footer not found");
  }

  const totalEntries = readUInt16LE(view, eocdOffset + 10);
  const centralDirectoryOffset = readUInt32LE(view, eocdOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (readUInt32LE(view, offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("Invalid PPTX central directory");
    }

    const compression = readUInt16LE(view, offset + 10);
    const compressedSize = readUInt32LE(view, offset + 20);
    const fileNameLength = readUInt16LE(view, offset + 28);
    const extraLength = readUInt16LE(view, offset + 30);
    const commentLength = readUInt16LE(view, offset + 32);
    const localHeaderOffset = readUInt32LE(view, offset + 42);
    const nameBytes = bytes.slice(offset + 46, offset + 46 + fileNameLength);
    const name = decodeUtf8(nameBytes);

    entries.push({
      name,
      compression,
      compressedSize,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Browser compression support is unavailable");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readUInt32LE(view, entry.localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error(`Invalid local header for ${entry.name}`);
  }

  const fileNameLength = readUInt16LE(view, entry.localHeaderOffset + 26);
  const extraLength = readUInt16LE(view, entry.localHeaderOffset + 28);
  const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressedBytes = bytes.slice(dataOffset, dataOffset + entry.compressedSize);

  if (entry.compression === 0) {
    return compressedBytes;
  }

  if (entry.compression === 8) {
    return inflateRaw(compressedBytes);
  }

  throw new Error(`Unsupported PPTX compression method: ${entry.compression}`);
}

export async function parsePptxSlides(source: string): Promise<PptxSlidePreview[]> {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to fetch PPTX (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const entries = parseZipEntries(bytes)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const slides: PptxSlidePreview[] = [];

  for (const entry of entries) {
    const slideBytes = await readZipEntry(bytes, entry);
    const xml = decodeUtf8(slideBytes);
    const text = extractSlideText(xml);
    const slideNumberMatch = entry.name.match(/slide(\d+)\.xml$/i);
    const index = slideNumberMatch ? Number(slideNumberMatch[1]) : slides.length + 1;
    slides.push({
      index,
      title: text.split(" ").slice(0, 8).join(" ") || `Slide ${index}`,
      text,
    });
  }

  return slides;
}
