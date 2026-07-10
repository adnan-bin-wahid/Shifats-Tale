import { Metadata } from "next";
import ReviewsClient from "./ReviewsClient";
import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { getPublicTestimonials } from "@/features/website-cms/actions/testimonials-actions";

export const metadata: Metadata = {
  title: "All Reviews | Shifat's Tales",
  description: "Read what our students and parents have to say about their experience with Shifat's Tales.",
};

export default async function ReviewsPage() {
  const heroData = await getPageSection("REVIEWS", "REVIEWS_HERO");
  const testimonialsData = await getPublicTestimonials();

  return <ReviewsClient heroData={heroData} testimonialsData={testimonialsData} />;
}
