import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getSectionItems } from "@/features/website-cms/actions/content-actions";
import NewsEventsItemsAdmin from "./NewsEventsItemsAdmin";

export const metadata: Metadata = {
  title: "Manage News & Events | Admin",
};

export default async function ManageNewsEventsPage() {
  await requireTeacher();

  const items = await getSectionItems("NEWS_EVENTS_ITEMS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manage News & Events</h1>
        <p className="text-muted mt-1">Add, edit, or remove announcements, upcoming orientation workshops, exam notices, and student spotlight celebrations.</p>
      </div>

      <NewsEventsItemsAdmin initialItems={items || []} />
    </div>
  );
}
