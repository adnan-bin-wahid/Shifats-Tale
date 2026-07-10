import { Metadata } from "next";
import HomeClient from "./HomeClient";
import { getPageSection, getSectionItems } from "@/features/website-cms/actions/content-actions";
import { getPublicTestimonials } from "@/features/website-cms/actions/testimonials-actions";

export const metadata: Metadata = {
  title: "Shifat's Tales | Admission & Academic Care",
  description: "Providing quality education to build the future of our students.",
};

export default async function HomePage() {
  const homeHeroSection = await getPageSection("HOME", "HOME_HERO");
  const homeStatsSection = await getPageSection("HOME", "HOME_STATS");
  const homeWhyChooseSection = await getPageSection("HOME", "HOME_WHY_CHOOSE");
  const homeTeacherSection = await getPageSection("HOME", "HOME_TEACHER");
  const homeTopStudentsSection = await getPageSection("HOME", "HOME_TOP_STUDENTS");
  const homeYoutubeSection = await getPageSection("HOME", "HOME_YOUTUBE_CLASSES");
  const homeGallerySection = await getPageSection("HOME", "HOME_GALLERY");
  
  const allCourses = await getSectionItems("COURSES_CARDS");
  const homeCoursesSection = await getPageSection("HOME", "HOME_FEATURED_COURSES");
  
  const selectedCourseIds: string[] = homeCoursesSection?.content?.selectedCourseIds || [];
  
  // Filter courses based on selected IDs and preserve the selection order
  const featuredCourses = selectedCourseIds
    .map(id => allCourses.find(c => c.id === id))
    .filter(Boolean);

  // Fallback to all courses if none are selected (for initial state before admin selects any)
  const displayCourses = featuredCourses.length > 0 ? featuredCourses : allCourses.slice(0, 5);

  const allStudents = await getSectionItems("RESULTS_STUDENTS");
  const homeSuccessSection = await getPageSection("HOME", "HOME_STUDENT_SUCCESS");
  
  const selectedStudentIds: string[] = homeSuccessSection?.content?.selectedStudentIds || [];
  
  // Filter students based on selected IDs and preserve the selection order
  const featuredStudents = selectedStudentIds
    .map(id => allStudents.find(s => s.id === id))
    .filter(Boolean);

  // Fallback to all students if none are selected
  const displayStudents = featuredStudents.length > 0 ? featuredStudents : allStudents.slice(0, 5);

  const albumsSection = await getPageSection("GALLERY", "GALLERY_ALBUMS");
  // @ts-ignore
  const { albumsData } = await import("@/data/albums");
  const allAlbums = albumsSection?.content?.albums || albumsData;
  const selectedAlbumIds: string[] = homeGallerySection?.content?.selectedAlbumIds || [];
  
  const featuredAlbums = selectedAlbumIds
    .map(id => allAlbums.find((a: any) => a.id === id))
    .filter(Boolean);
    
  const displayAlbums = featuredAlbums.length > 0 ? featuredAlbums : allAlbums.slice(0, 4);

  // Fetch approved testimonials dynamically
  const testimonialsData = await getPublicTestimonials();
  const homeTestimonialsSection = await getPageSection("HOME", "HOME_TESTIMONIALS");
  
  const selectedTestimonialIds: string[] = homeTestimonialsSection?.content?.selectedTestimonialIds || [];
  
  const featuredTestimonials = selectedTestimonialIds
    .map(id => testimonialsData.find(t => t.id === id))
    .filter(Boolean);
    
  const displayTestimonials = featuredTestimonials.length > 0 ? featuredTestimonials : testimonialsData.slice(0, 9);

  return <HomeClient 
    heroData={homeHeroSection}
    statsData={homeStatsSection}
    whyChooseData={homeWhyChooseSection}
    teacherData={homeTeacherSection}
    topStudentsData={homeTopStudentsSection}
    youtubeData={homeYoutubeSection}
    galleryData={homeGallerySection}
    displayAlbums={displayAlbums}
    displayCourses={displayCourses} 
    headerData={homeCoursesSection} 
    displayStudents={displayStudents}
    successHeaderData={homeSuccessSection}
    testimonialsData={displayTestimonials}
    testimonialsHeaderData={homeTestimonialsSection}
  />;
}
