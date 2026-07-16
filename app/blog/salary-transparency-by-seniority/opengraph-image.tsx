import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "The higher the job, the more they hide the pay: salary disclosure by seniority";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Data",
      title: "The higher the job, the more they hide the pay",
      stat: "41% -> 14%",
    }),
    size,
  );
}
