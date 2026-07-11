import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { RoutineCardForm } from "@/features/website-cms/components/RoutineCardForm";

export default async function ClassRoutineCardAdminPage() {
  const initialData = await getPageSection("CLASS_ROUTINE", "ROUTINE_CARD");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Class Routine Image (Card Section)</h1>
        <p className="text-muted text-sm mt-1">
          Upload or choose the massive official class routine/schedule image displayed full-view inside the card section.
        </p>
      </div>
      
      <RoutineCardForm 
        initialData={initialData} 
        pageKey="CLASS_ROUTINE" 
        sectionKey="ROUTINE_CARD"
        folderKey="CLASS_ROUTINE"
      />
    </div>
  );
}
