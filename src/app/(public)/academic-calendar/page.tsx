import { Metadata } from "next";
import AcademicCalendarClient from "./AcademicCalendarClient";
import { getPageSection } from "@/features/website-cms/actions/content-actions";

export const metadata: Metadata = {
  title: "Academic Calendar | Shifat's Tales",
  description: "Explore Shifat Sir's complete academic calendar and roadmap.",
};

export default async function AcademicCalendarPage() {
  const heroData = await getPageSection("ACADEMIC_CALENDAR", "CALENDAR_HERO");

  return <AcademicCalendarClient heroData={heroData} />;
}
