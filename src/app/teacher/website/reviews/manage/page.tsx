import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getAllTestimonialsAdmin } from "@/features/website-cms/actions/testimonials-actions";
import TestimonialsAdmin from "./TestimonialsAdmin";

export const metadata: Metadata = {
  title: "Testimonials & Reviews | Home Admin",
};

export default async function TestimonialsAdminPage() {
  await requireTeacher();

  // Fetch all reviews from the database
  const allTestimonials = await getAllTestimonialsAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#08132E]">Parent & Student Testimonials</h1>
        <p className="text-gray-600 mt-1">Manage and approve reviews to display on the website home page.</p>
      </div>

      <TestimonialsAdmin initialTestimonials={allTestimonials} />
    </div>
  );
}
