import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "We 7x'd our job-board coverage overnight. 13,000 of the new postings were duplicates.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Data",
      title: "13,000 of the new postings were duplicates",
      stat: "38%",
    }),
    size,
  );
}
