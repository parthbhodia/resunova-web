import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, blogOgImage } from "@/lib/ogImage";
import { blogPostBySlug } from "@/lib/atsBlogPosts";

export const dynamic = "force-static";
export const alt = "LinkedIn's applicant count is measuring clicks, not applications.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const POST = blogPostBySlug("linkedin-applicant-count-clicks-not-applications");

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Data",
      title: "The applicant count is measuring clicks, not applications",
      stat: POST?.stat,
    }),
    size,
  );
}
