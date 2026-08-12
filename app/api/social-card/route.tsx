/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_NAME, FAVICON_PATH } from "../../lib/brand";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const logoData = await readFile(join(process.cwd(), "public", FAVICON_PATH.replace(/^\/+/, "")));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <img
        src={logoSrc}
        alt={BRAND_NAME}
        width={950}
        height={950}
        style={{ objectFit: "contain" }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    },
  );
}
