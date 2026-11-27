import SeoGroupPage, { seoGroupMetadata } from "../../seo/SeoGroupPage";
export const revalidate = 120;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  return seoGroupMetadata("category", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <SeoGroupPage kind="category" slug={(await params).slug} />;
}
