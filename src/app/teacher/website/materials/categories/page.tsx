import { getPageSection } from "@/features/website-cms/actions/content-actions";
import MaterialsCategoriesAdmin from "./MaterialsCategoriesAdmin";

export default async function MaterialsCategoriesPage() {
  // We will store categories in the MATERIALS page under MATERIALS_CATEGORIES section
  const initialData = await getPageSection("MATERIALS", "MATERIALS_CATEGORIES");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manage Material Categories</h1>
        <p className="text-muted text-sm mt-1">
          Add or remove categories that students will use to filter materials on the public page.
        </p>
      </div>
      
      <MaterialsCategoriesAdmin initialData={initialData} />
    </div>
  );
}
