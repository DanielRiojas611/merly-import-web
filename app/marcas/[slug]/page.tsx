import SeoGroupPage, { seoGroupMetadata } from "../../seo/SeoGroupPage";
export const revalidate = 120;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  return seoGroupMetadata("brand", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <SeoGroupPage kind="brand" slug={(await params).slug} />;
}
