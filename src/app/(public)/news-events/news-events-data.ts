export interface NewsEventItem {
  id: string;
  title: string;
  category: "EVENT" | "NOTICE" | "NEWS";
  date: string;
  month: string;
  time?: string;
  location?: string;
  excerpt: string;
  fullContent: string[];
  imageUrl?: string;
  isFeatured?: boolean;
}

export const defaultCuratedItems: NewsEventItem[] = [
  {
    id: "evt-1",
    title: "HSC '26 & '27 Grand Orientation & Scholarship Model Test",
    category: "EVENT",
    date: "25",
    month: "AUG",
    time: "3:30 PM - 6:30 PM",
    location: "Shifat's Tales Campus, 3rd Floor, Rangunia, Chattogram",
    excerpt:
      "A mega orientation workshop for incoming science students featuring concept-building strategies, live physics demonstrations, and an exclusive scholarship exam.",
    fullContent: [
      "Join Shifat Sir for an inspiring 3-hour orientation session designed specifically for HSC 2026 and 2027 science aspirants.",
      "The event starts with a high-impact breakdown of the HSC Physics and Higher Mathematics curriculum, discussing common traps and how to score A+ effortlessly.",
      "Following the orientation, a 45-minute Scholarship Model Test will be held. Top 10 scorers will receive up to 50% merit scholarships on their tuition fees!",
      "All attendees will receive Shifat Sir's exclusive Formula Booklet free of cost. Seats are limited to 80 students due to venue capacity.",
    ],
    imageUrl: "/images/flyer_hsc26_hsc27.jpg",
    isFeatured: true,
  },
  {
    id: "not-1",
    title: "SSC 2026 Batch Final Revision & Model Test Routine Published",
    category: "NOTICE",
    date: "18",
    month: "AUG",
    time: "4:00 PM Daily",
    location: "Both Campus & Online Portal",
    excerpt:
      "The complete schedule for our intensive 12-week chapter-wise revision and OMR-based model tests is now officially released.",
    fullContent: [
      "Attention all SSC 2026 science batch candidates: the full chapter-wise revision schedule along with the Model Test syllabus is now active.",
      "Exams will take place every Friday and Tuesday afternoon. Each test will consist of 25 MCQ questions and 3 Creative Questions (CQ) strictly evaluated following board criteria.",
      "Solved copies and highest marks distribution will be published inside the Student Portal within 24 hours of each exam.",
      "Students can download the PDF routine directly from the Materials section or collect a hard copy from the coaching reception counter.",
    ],
    imageUrl: "/images/flyer_revision_2026.jpg",
  },
  {
    id: "nws-1",
    title: "Congratulations to Shifat's Tales Top Ranking Engineering Aspirants",
    category: "NEWS",
    date: "10",
    month: "AUG",
    time: "Announcement",
    location: "Shifat's Tales Hall of Fame",
    excerpt:
      "Celebrating our brilliant students who secured top positions in university admission tests, continuing our legacy of academic excellence.",
    fullContent: [
      "We are thrilled to announce that over 35 students from our senior batches have successfully secured merit positions across top public universities and engineering institutions.",
      "Special congratulations to our students who placed within the Top 500 in engineering admission merit lists through consistent hard work and problem-solving discipline.",
      "Shifat Sir will host an exclusive Merit Award Ceremony & Dinner next month to felicitate all achievers and present them with honorary plaques.",
    ],
    imageUrl: "/images/gallery-solve.png",
  },
  {
    id: "evt-2",
    title: "Weekly Physics Concept Marathon & Interactive Problem Solving",
    category: "EVENT",
    date: "29",
    month: "AUG",
    time: "9:00 AM - 12:00 PM",
    location: "Room 302, Shifat's Tales Main Campus",
    excerpt:
      "An intensive 3-hour deep dive into Electricity & Magnetism problems with live step-by-step whiteboard derivations.",
    fullContent: [
      "Struggling with complex circuit diagrams or magnetic field vectors? This weekly concept marathon is open for all enrolled HSC 2nd Year students.",
      "Shifat Sir will walk through 25 advanced admission-level mathematical problems step-by-step without skipping intermediate calculations.",
      "Students are requested to bring their scientific calculators and graph notebooks. Tea and light refreshments will be served during the short break.",
    ],
    imageUrl: "/images/gallery-classroom.png",
  },
  {
    id: "not-2",
    title: "Friday Special Math Admission Care Workshop Registration Open",
    category: "NOTICE",
    date: "05",
    month: "SEP",
    time: "5:00 PM - 7:00 PM",
    location: "Shifat's Tales Campus, Rangunia",
    excerpt:
      "Registration is now open for our specialized calculus and coordinate geometry shortcut technique workshop.",
    fullContent: [
      "To help students master time-saving shortcut techniques for university admission tests, we are organizing a special Friday evening workshop.",
      "Topics covered: Integration shortcuts, tangent & normal equation hacks, and vector cross-product visualization.",
      "Prior registration is required as seats are limited to 60 participants. Please confirm your seat at the office counter by Thursday evening.",
    ],
    imageUrl: "/images/flyer_model_test_2025.png",
  },
  {
    id: "nws-2",
    title: "New Batch Enrollment Open for Class 11 Physics & Higher Math",
    category: "NEWS",
    date: "12",
    month: "SEP",
    time: "All Day",
    location: "Admission Office & Online Portal",
    excerpt:
      "Admissions are officially underway for our foundational Class 11 batches with small group sizes and personalized mentoring.",
    fullContent: [
      "Shifat's Tales announces new enrollment slots for Class 11 students wishing to build a solid academic foundation right from the beginning of their college journey.",
      "Why join our Class 11 Batches? Small batch capacity, daily lecture sheets, weekly evaluation exams, and 1-on-1 problem-solving hours directly with Shifat Sir.",
      "To maintain high quality standards, we do not admit students once the batch capacity is filled. Visit our campus during afternoon office hours for batch counseling.",
    ],
    imageUrl: "/images/gallery-notes.png",
  },
];

export function formatAllNewsEventItems(newsEventItems?: any[]): NewsEventItem[] {
  const cmsFormatted: NewsEventItem[] = (newsEventItems || []).map((item: any) => {
    const meta = item.metadata || {};
    return {
      id: item.id || `cms-${Math.random()}`,
      title: item.title || "Untitled Announcement",
      category: item.subtitle || meta.category || item.category || "NOTICE",
      date: meta.date || item.date || "01",
      month: meta.month || item.month || "JAN",
      time: meta.time || item.time || "Office Hours",
      location: meta.location || item.location || "Shifat's Tales Campus",
      excerpt: item.body || meta.excerpt || item.excerpt || item.description || "Click to read full details.",
      fullContent: Array.isArray(meta.fullContent)
        ? meta.fullContent
        : typeof meta.fullContent === "string"
        ? meta.fullContent.split("\n\n")
        : Array.isArray(item.fullContent)
        ? item.fullContent
        : typeof item.fullContent === "string"
        ? item.fullContent.split("\n\n")
        : [item.body || meta.excerpt || item.excerpt || item.description || ""],
      imageUrl: item.mediaUrl || meta.imageUrl || item.imageUrl || "/images/gallery-event.png",
      isFeatured: meta.isFeatured || item.isFeatured || false,
    };
  });

  // Return strictly the items managed inside the backend CMS. If no items exist in backend, return empty array.
  return cmsFormatted;
}
