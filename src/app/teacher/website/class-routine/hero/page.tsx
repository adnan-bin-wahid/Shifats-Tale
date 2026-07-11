import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { SharedHeroForm } from "@/features/website-cms/components/SharedHeroForm";

export default async function ClassRoutineHeroAdminPage() {
  const initialData = await getPageSection("CLASS_ROUTINE", "ROUTINE_HERO");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Class Routine Hero Section</h1>
        <p className="text-muted text-sm mt-1">
          Manage the eyebrow, main title, subtitle, description, and cover background photo of the Class Routine page hero section.
        </p>
      </div>
      
      <SharedHeroForm 
        initialData={initialData} 
        pageKey="CLASS_ROUTINE" 
        sectionKey="ROUTINE_HERO"
        folderKey="CLASS_ROUTINE"
      />
    </div>
  );
}
