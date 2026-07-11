import { Metadata } from "next";
import ClassRoutineClient from "./ClassRoutineClient";
import { getPageSection } from "@/features/website-cms/actions/content-actions";

export const metadata: Metadata = {
  title: "Class Routine | Shifat's Tales",
  description: "Explore Shifat Sir's complete class routines and schedule.",
};

export default async function ClassRoutinePage() {
  const [heroData, cardData] = await Promise.all([
    getPageSection("CLASS_ROUTINE", "ROUTINE_HERO"),
    getPageSection("CLASS_ROUTINE", "ROUTINE_CARD"),
  ]);

  return <ClassRoutineClient heroData={heroData} cardData={cardData} />;
}
