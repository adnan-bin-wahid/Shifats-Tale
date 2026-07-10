import { Metadata } from "next";
import { requireTeacher } from "@/lib/auth-guards";
import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { getPublicTestimonials } from "@/features/website-cms/actions/testimonials-actions";
import HomeTestimonialsAdmin from "./HomeTestimonialsAdmin";

export const metadata: Metadata = {
  title: "Testimonials | Home Admin",
};

export default async function HomeTestimonialsPage() {
  await requireTeacher();

  // Fetch all approved testimonials
  const allTestimonials = await getPublicTestimonials();

  // Fetch the current featured testimonials settings for the Home page
  const section = await getPageSection("HOME", "HOME_TESTIMONIALS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#08132E]">Home Page Reviews</h1>
        <p className="text-gray-600 mt-1">Select which student and parent reviews should appear in the scrolling marquee on the Home Page.</p>
      </div>

      <HomeTestimonialsAdmin 
        allItems={allTestimonials} 
        initialSectionData={section} 
        sectionId={section?.id} 
      />
    </div>
  );
}
