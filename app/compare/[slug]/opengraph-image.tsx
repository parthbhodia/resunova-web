import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, compareOgImage } from "@/lib/ogImage";
import { COMPARISONS, getComparison } from "@/lib/competitorComparison";

export const alt = "Resunova vs a competitor: free ATS tailoring compared";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  return new ImageResponse(
    compareOgImage({ competitor: c?.competitor ?? "competitors", asOf: c?.asOf ?? "" }),
    size,
  );
}
