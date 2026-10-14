import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "Ask for a Referral Without Being Awkward · Resunova";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Referrals",
      title: "Ask without being awkward. Offer help without getting flooded.",
    }),
    size,
  );
}
