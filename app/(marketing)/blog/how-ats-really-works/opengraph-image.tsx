import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "How applicant tracking systems really work";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    blogOgImage({ kicker: "Research", title: "How ATS really works: visibility, matching, and parsing" }),
    size,
  );
}
