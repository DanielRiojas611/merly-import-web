import { put } from "@vercel/blob";

const DATA_IMAGE_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i;
const MAX_IMAGE_BYTES = 4_000_000;

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "imagen";
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  return "webp";
}

export function isStoredBlobUrl(value: string) {
  return value.includes(".blob.vercel-storage.com/");
}

export async function persistAdminImage(
  value: string | null | undefined,
  folder: "products" | "banners",
  name: string,
) {
  const image = String(value ?? "").trim();
  if (!image || isStoredBlobUrl(image)) return image;

  const match = image.match(DATA_IMAGE_PATTERN);
  if (!match) return image;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("BLOB_STORAGE_NOT_CONFIGURED");

  const contentType = match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("BLOB_IMAGE_SIZE_INVALID");
  }

  const pathname = `${folder}/${safeName(name)}-${Date.now()}.${extensionFor(contentType)}`;
  const blob = await put(pathname, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType,
    cacheControlMaxAge: 31_536_000,
    token,
  });

  return blob.url;
}
