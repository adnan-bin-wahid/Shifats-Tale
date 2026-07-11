import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { CalendarCardForm } from "@/features/website-cms/components/CalendarCardForm";

export default async function AcademicCalendarCardAdminPage() {
  const initialData = await getPageSection("ACADEMIC_CALENDAR", "CALENDAR_CARD");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Academic Calendar Image (Card Section)</h1>
        <p className="text-muted text-sm mt-1">
          Upload or choose the massive official academic schedule/routine image displayed full-view inside the card section.
        </p>
      </div>
      
      <CalendarCardForm 
        initialData={initialData} 
        pageKey="ACADEMIC_CALENDAR" 
        sectionKey="CALENDAR_CARD"
        folderKey="ACADEMIC_CALENDAR"
      />
    </div>
  );
}
