import { Metadata } from "next";
import ResultsClient from "./ResultsClient";
import { getPageSection, getSectionItems } from "@/features/website-cms/actions/content-actions";

export const metadata: Metadata = {
  title: "Success Stories & Alumni | Shifat's Tales",
  description: "Explore the brilliant minds who have achieved top ranks in engineering and medical admission tests under our guidance.",
};

export default async function ResultsPage() {
  const heroData = await getPageSection("RESULTS", "RESULTS_HERO");
  const studentItems = await getSectionItems("RESULTS_STUDENTS");

  return <ResultsClient heroData={heroData} studentItems={studentItems} />;
}
