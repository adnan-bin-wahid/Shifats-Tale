import { Metadata } from "next";
import AcademicCalendarClient from "./AcademicCalendarClient";
import { getPageSection, getSectionItems } from "@/features/website-cms/actions/content-actions";

export const metadata: Metadata = {
  title: "Academic Calendar & Roadmap | Shifat's Tales",
  description: "Explore Shifat Sir's complete academic roadmap, exam schedules, class routines, and batch milestones.",
};

export default async function AcademicCalendarPage() {
  const heroData = await getPageSection("ACADEMIC_CALENDAR", "CALENDAR_HERO");
  const eventsData = await getSectionItems("CALENDAR_EVENTS");

  return <AcademicCalendarClient heroData={heroData} eventsData={eventsData} />;
}
