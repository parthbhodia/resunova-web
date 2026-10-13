import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, blogOgImage } from "@/lib/ogImage";
import { blogPostBySlug } from "@/lib/atsBlogPosts";

export const dynamic = "force-static";
export const alt = "96% of job postings won't say whether they sponsor a visa";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const POST = blogPostBySlug("h1b-visa-sponsorship-job-postings");

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Data",
      title: "96% of job postings won't say whether they sponsor a visa",
      stat: POST?.stat,
    }),
    size,
  );
}
