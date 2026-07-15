import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getPageSection, getSectionItems } from "@/features/website-cms/actions/content-actions";
import HomeNewsEventsAdmin from "./HomeNewsEventsAdmin";

export const metadata: Metadata = {
  title: "Manage Home Page News & Events | Teacher CMS",
};

export default async function HomeNewsEventsPage() {
  await requireTeacher();

  // Fetch all existing news & event items from the CMS database
  const allNewsItems = await getSectionItems("NEWS_EVENTS_ITEMS");
  const sectionData = await getPageSection("HOME", "HOME_NEWS_EVENTS");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h1 className="text-2xl font-bold text-primary mb-2">Home Page News & Events</h1>
        <p className="text-sm text-gray-500">
          Select which announcement or event card appears as the big Featured Spotlight on the left, and which cards appear on the right side of the home page section.
        </p>
      </div>

      <HomeNewsEventsAdmin
        allNewsItems={allNewsItems || []}
        initialSectionData={sectionData}
      />
    </div>
  );
}
