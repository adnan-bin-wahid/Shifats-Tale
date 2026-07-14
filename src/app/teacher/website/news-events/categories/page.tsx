import { getPageSection } from "@/features/website-cms/actions/content-actions";
import NewsEventsCategoriesAdmin from "./NewsEventsCategoriesAdmin";

export default async function NewsEventsCategoriesPage() {
  const initialData = await getPageSection("NEWS_EVENTS", "NEWS_EVENTS_CATEGORIES");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manage News & Events Categories</h1>
        <p className="text-muted text-sm mt-1">
          Add or remove categories (e.g. EVENT, NOTICE, NEWS, SCHOLARSHIP, WORKSHOP) that you can assign to cards and students can use to filter on the public page.
        </p>
      </div>
      
      <NewsEventsCategoriesAdmin initialData={initialData} />
    </div>
  );
}
