/**
 * Site Configuration Data
 * 
 * Edit this file to customize the site name, description, contact details, map links,
 * teacher bio, and hero texts. You can replace these placeholders with real coaching
 * center details.
 */

export interface SiteInfo {
  coachingCenterName: string;
  tagline: string;
  shortDescription: string;
  logoUrl?: string;
  phone: string;
  whatsapp: string; // WhatsApp API phone number prefix (no plus or spaces, e.g. "8801879169446")
  email: string;
  address: string;
  nearbyLandmark: string;
  officeHours: string;
  facebookUrl: string;
  youtubeUrl: string;
  googleMapEmbedUrl: string;
  googleMapDirectionUrl: string;
  teacherName: string;
  teacherDesignation: string;
  teacherExperience: string;
  teacherSpecialty: string;
  teacherBio: string;
  heroHeadline: string;
  heroDescription: string;
  footerDescription: string;
  footerNotice: string;
  footerCopyright: string;
  quickLinks: { label: string; href: string; isPortal?: boolean }[];
}

export const siteInfo: SiteInfo = {
  coachingCenterName: "Shifat's Tales — Academic & Admission Care",
  tagline: "Admissions Open for SSC & HSC Batches",
  shortDescription: "A premium personal coaching ecosystem specialized in Physics and Higher Mathematics. Founded and mentored by Md. Zia Uddin Azad Sifat (Shifat Sir). Empowering SSC and HSC science students to build core concepts and score top ranks in university admission tests.",
  phone: "+880 1879-169446",
  whatsapp: "8801879169446",
  email: "info@shifatstales.com",
  address: "Sekandar & M.P Yusuf Building, 3rd Floor, next to Rangunia College, Rangunia, Chattogram, Bangladesh",
  nearbyLandmark: "next to Rangunia College",
  officeHours: "Daily 4:00 PM - 9:00 PM",
  facebookUrl: "https://facebook.com",
  youtubeUrl: "https://youtube.com",
  googleMapEmbedUrl: "https://maps.google.com/maps?q=Rangunia%20Government%20College,%20Chattogram&t=&z=16&ie=UTF8&iwloc=&output=embed",
  googleMapDirectionUrl: "https://maps.google.com/?q=Rangunia+Government+College+Chattogram",
  teacherName: "Md. Zia Uddin Azad Sifat",
  teacherDesignation: "Lead Mentor & CEO",
  teacherExperience: "10+ Years",
  teacherSpecialty: "EEE, CUET | Physics & Mathematics Specialist",
  teacherBio: "Hello, I am Md. Zia Uddin Azad Sifat (Shifat Sir). As a B.Sc. Engineer from CUET, I specialize in simplifying complex Physics and Higher Mathematics concepts. Through structured classes, weekly exams, and concept-first teaching, I guide SSC and HSC science students to excel in both board exams and engineering admission preparation.",
  heroHeadline: "Shifat's Tales",
  heroDescription: "Physics & Higher Mathematics Coaching",
  footerDescription: "A premium personal coaching ecosystem for Physics and Higher Mathematics. Empowering SSC, HSC & Admission aspirants to achieve top ranks.",
  footerNotice: "We do not offer automatic online enrollment or payments. To join our programs, please connect directly with Shifat Sir or visit our venue.",
  footerCopyright: `© ${new Date().getFullYear()} Shifat's Tales. All rights reserved.`,
  quickLinks: [
    { label: "Home", href: "#home" },
    { label: "Programs", href: "#courses" },
    { label: "Courses", href: "#courses" },
    { label: "Success Results", href: "#results" },
    { label: "Free Video Lectures", href: "#youtube-classes" },
    { label: "Meet Shifat Sir", href: "#teacher" },
    { label: "Student Login", href: "/login", isPortal: true },
    { label: "Admin Login", href: "/login", isPortal: true },
  ]
};

export interface StatItem {
  number: string;
  label: string;
  description: string;
  iconName: "Award" | "Users" | "GraduationCap" | "CheckCircle";
}

export const stats: StatItem[] = [
  {
    number: "10+",
    label: "Years Experience",
    description: "Teaching Physics & Mathematics",
    iconName: "Award",
  },
  {
    number: "1,200+",
    label: "Students Guided",
    description: "SSC and HSC Candidates",
    iconName: "Users",
  },
  {
    number: "40+",
    label: "Successful Batches",
    description: "Academic & Admission Care",
    iconName: "GraduationCap",
  },
  {
    number: "Weekly",
    label: "Exam System",
    description: "Continuous progress evaluation",
    iconName: "CheckCircle",
  },
];

export interface BenefitItem {
  title: string;
  description: string;
  iconName: "UserCheck" | "Users" | "ClipboardList" | "NotebookTabs" | "MessageCircle" | "Cpu";
}

export const benefits: BenefitItem[] = [
  {
    title: "Personal Guidance",
    description: "Direct mentorship from Shifat Sir, including target goal planning, parent alignment feedback, and personalized tracking.",
    iconName: "UserCheck",
  },
  {
    title: "Small Batch Environment",
    description: "Intentionally capped intake (max 30 candidates per batch) to make sure no student sits silently with unresolved doubts.",
    iconName: "Users",
  },
  {
    title: "Weekly Exams",
    description: "Rigorous weekly quizzes, board-standard creative questions, and mock evaluations to build test-taking confidence.",
    iconName: "ClipboardList",
  },
  {
    title: "Lecture Sheets",
    description: "Curated worksheets, handwritten concept books, and mathematical shortcut checklists compiled directly by Shifat Sir.",
    iconName: "NotebookTabs",
  },
  {
    title: "Doubt Solving",
    description: "Designated solving classes and active online Q&A groups to answer every individual student query step-by-step.",
    iconName: "MessageCircle",
  },
  {
    title: "Concept-Based Teaching",
    description: "We focus on the underlying physical laws and mathematical proofs, helping students visualize concepts instead of memorizing.",
    iconName: "Cpu",
  }
];

export interface TeachingMethod {
  title: string;
  desc: string; // Keep as 'desc' for backward compatibility
}

export const teachingMethods: TeachingMethod[] = [
  {
    title: "Concept-First Learning",
    desc: "Prioritizing complete visualization of scientific laws before solving formulas."
  },
  {
    title: "Chapter-Wise Problem Solving",
    desc: "Systematic mastery of textbook exercises and math shortcuts chapter by chapter."
  },
  {
    title: "Board Question Practice",
    desc: "Intensive drills using past test banks and creative question templates."
  },
  {
    title: "Weak Student Support",
    desc: "Tailored doubt resolution slots and parent sync reports for student accountability."
  }
];

