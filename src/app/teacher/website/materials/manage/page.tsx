import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getSectionItems, getPageSection } from "@/features/website-cms/actions/content-actions";
import MaterialsItemsAdmin from "./MaterialsItemsAdmin";

export const metadata: Metadata = {
  title: "Manage Public Materials | Admin",
};

export default async function ManageMaterialsPage() {
  await requireTeacher();

  // Fetch existing items and categories
  const items = await getSectionItems("MATERIALS_ITEMS");
  const categoriesData = await getPageSection("MATERIALS", "MATERIALS_CATEGORIES");
  const categories = categoriesData?.content?.categories || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Manage Public Materials</h1>
        <p className="text-muted mt-1">Upload and manage PDFs, Images, and Notes for the public materials page.</p>
      </div>

      <MaterialsItemsAdmin initialItems={items} categories={categories} />
    </div>
  );
}
