import { Metadata } from "next";
import NewsEventsClient from "./NewsEventsClient";
import { getPageSection, getSectionItems } from "@/features/website-cms/actions/content-actions";

export const metadata: Metadata = {
  title: "News & Events | Shifat's Tales — Physics & Higher Mathematics Care",
  description: "Stay updated with our latest announcements, orientation workshops, scholarship model tests, revision schedules, and academic celebrations.",
};

export default async function NewsEventsPage() {
  const heroData = await getPageSection("NEWS_EVENTS", "NEWS_EVENTS_HERO");
  const newsEventItems = await getSectionItems("NEWS_EVENTS_ITEMS");

  return <NewsEventsClient heroData={heroData} newsEventItems={newsEventItems || []} />;
}
