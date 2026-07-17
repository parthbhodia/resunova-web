import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, blogOgImage } from "@/lib/ogImage";
import { blogPostBySlug } from "@/lib/atsBlogPosts";

export const dynamic = "force-static";
export const alt = "The higher the job, the more they hide the pay: salary disclosure by seniority";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const POST = blogPostBySlug("salary-transparency-by-seniority");

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Data",
      title: "The higher the job, the more they hide the pay",
      stat: POST?.stat,
    }),
    size,
  );
}
