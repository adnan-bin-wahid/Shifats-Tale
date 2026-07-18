import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getSectionItems } from "@/features/website-cms/actions/content-actions";
import StudentCardsAdmin from "./StudentCardsAdmin";

export const metadata: Metadata = {
  title: "Manage Student Results | Admin",
};

export default async function StudentResultsPage() {
  await requireTeacher();

  // Fetch existing student results
  const items = await getSectionItems("RESULTS_STUDENTS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#08132E]">Manage Student Results</h1>
        <p className="text-gray-600 mt-1">Add, edit, or remove student success stories from the Results page.</p>
      </div>

      <StudentCardsAdmin initialItems={items} />
    </div>
  );
}
