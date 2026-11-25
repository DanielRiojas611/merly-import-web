import { BlobNotFoundError, BlobPreconditionFailedError, head, put } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDatabasePublishedCatalog } from "./neon-catalog";
import { CATALOG_SNAPSHOT_PATH, CATALOG_SNAPSHOT_TAG, CATALOG_SNAPSHOT_URL } from "./published-catalog";

export async function publishCatalogSnapshot() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("BLOB_STORAGE_NOT_CONFIGURED");
  for (let attempt = 0; attempt < 3; attempt++) {
    let etag: string | undefined;
    try { etag = (await head(CATALOG_SNAPSHOT_URL, { token })).etag; }
    catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
    const products = await getDatabasePublishedCatalog();
    const total = products.length;
    if (new Set(products.map(p => p.id)).size !== total) throw new Error("CATALOG_SNAPSHOT_INCOMPLETE");
    try {
      await put(CATALOG_SNAPSHOT_PATH, JSON.stringify({ exportedAt: new Date().toISOString(), products }), {
        token, access: "public", contentType: "application/json", addRandomSuffix: false,
        allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}), cacheControlMaxAge: 60,
      });
    } catch (error) { if (error instanceof BlobPreconditionFailedError) continue; throw error; }
    revalidateTag(CATALOG_SNAPSHOT_TAG, { expire: 0 });
    for (const path of ["/", "/catalogo", "/productos", "/sitemap.xml", "/api/catalogo"]) revalidatePath(path);
    return total;
  }
  throw new Error("CATALOG_PUBLICATION_CONFLICT");
}

export async function synchronizePublishedCatalog() {
  try { await publishCatalogSnapshot(); return null; }
  catch (error) { console.error("Catalog snapshot synchronization failed", error); return "Los cambios se guardaron, pero falta actualizar el catálogo público. Usa Actualizar catálogo público para reintentar."; }
}
