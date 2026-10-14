import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "Most of Your Job Search Shouldn't Be Applications · Resunova";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Guide post. No invented headline rate. The card leads with the thesis; the
 * body cites Gem/Ashby/Glassdoor/Huntr for the numbers.
 */
export default function OgImage() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Job search 2026",
      title: "Most of your job search shouldn't be applications",
    }),
    size,
  );
}
