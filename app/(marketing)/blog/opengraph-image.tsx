import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "Resunova job market research and resume guides";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Research and guides",
      title: "What the job market data actually says",
    }),
    size,
  );
}
