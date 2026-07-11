import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { SharedHeroForm } from "@/features/website-cms/components/SharedHeroForm";

export default async function AcademicCalendarHeroAdminPage() {
  const initialData = await getPageSection("ACADEMIC_CALENDAR", "CALENDAR_HERO");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Academic Calendar Hero Section</h1>
        <p className="text-muted text-sm mt-1">
          Manage the eyebrow, main title, subtitle, description, and cover background photo of the Academic Calendar page hero section.
        </p>
      </div>
      
      <SharedHeroForm 
        initialData={initialData} 
        pageKey="ACADEMIC_CALENDAR" 
        sectionKey="CALENDAR_HERO"
        folderKey="ACADEMIC_CALENDAR"
      />
    </div>
  );
}
