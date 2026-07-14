import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getSectionItems, getPageSection } from "@/features/website-cms/actions/content-actions";
import NewsEventsBodyAdmin from "./NewsEventsBodyAdmin";

export const metadata: Metadata = {
  title: "Manage News & Events (Body Cards) | Teacher CMS",
};

export default async function NewsEventsBodyPage() {
  await requireTeacher();

  // Fetch all existing news & event items and categories from the CMS database
  const items = await getSectionItems("NEWS_EVENTS_ITEMS");
  const categoriesData = await getPageSection("NEWS_EVENTS", "NEWS_EVENTS_CATEGORIES");
  const categories = categoriesData?.content?.categories && Array.isArray(categoriesData.content.categories) && categoriesData.content.categories.length > 0
    ? categoriesData.content.categories
    : ["EVENT", "NOTICE", "NEWS"];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h1 className="text-2xl font-bold text-primary mb-1">News & Events Body (Card System)</h1>
        <p className="text-sm text-muted">
          Manage your news, notices, workshops, and announcements right here in card format exactly like Projects. Add new cards or edit existing ones.
        </p>
      </div>

      <NewsEventsBodyAdmin initialItems={items || []} categories={categories} />
    </div>
  );
}
