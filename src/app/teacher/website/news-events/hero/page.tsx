import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { SharedHeroForm } from "@/features/website-cms/components/SharedHeroForm";

export default async function NewsEventsHeroAdminPage() {
  const initialData = await getPageSection("NEWS_EVENTS", "NEWS_EVENTS_HERO");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">News & Events Hero Section</h1>
        <p className="text-muted text-sm mt-1">Manage the title, subtitle, description, and background banner image of the News & Events page.</p>
      </div>
      
      <SharedHeroForm 
        initialData={initialData} 
        pageKey="NEWS_EVENTS" 
        sectionKey="NEWS_EVENTS_HERO"
        folderKey="NEWS_EVENTS"
      />
    </div>
  );
}
