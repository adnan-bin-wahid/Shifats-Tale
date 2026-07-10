import { Metadata } from "next";
import MaterialsClient from "./MaterialsClient";
import { getPageSection, getSectionItems } from "@/features/website-cms/actions/content-actions";

export const metadata: Metadata = {
  title: "Study Materials & Resources | Shifat's Tales",
  description: "Access premium study materials, notes, and resources curated by Shifat Sir for academic excellence.",
};

export default async function MaterialsPage() {
  const heroData = await getPageSection("MATERIALS", "MATERIALS_HERO");
  // We'll fetch materials here later
  const materialItems = await getSectionItems("MATERIALS_ITEMS");

  return <MaterialsClient heroData={heroData} materialItems={materialItems} />;
}
