import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atención para distribuidores",
  alternates: { canonical: "/distribuidor" },
  openGraph: { url: "/distribuidor" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
