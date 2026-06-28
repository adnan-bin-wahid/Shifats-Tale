import { siteInfo } from "./site";

export interface ContactHeroData {
  eyebrow: string;
  title: string;
  highlightedText: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  imageSrc: string;
}

export interface ContactLocationData {
  title: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  availability: string;
  googleMapEmbedUrl: string;
  googleMapDirectionUrl: string;
}

export interface ContactFormConfig {
  title: string;
  description: string;
  submitLabel: string;
}

export interface GuidanceCtaData {
  eyebrow: string;
  title: string;
  description: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
}

export interface TrustHighlightItem {
  id: string;
  title: string;
  iconName: "Clock" | "Users" | "UserCheck" | "GraduationCap";
}

export const contactHeroData: ContactHeroData = {
  eyebrow: "GET IN TOUCH",
  title: "Let's ",
  highlightedText: "Connect",
  description: "Have any questions or need guidance? I'm here to help. Reach out anytime — I'll get back to you as soon as possible.",
  breadcrumbs: [
    { label: "Home", href: "/" },
    { label: "Contact Me" },
  ],
  imageSrc: "/images/gallery-classroom.png",
};

export const contactLocationData: ContactLocationData = {
  title: "My Location",
  description: "Visit me at the office for personalized guidance.",
  address: siteInfo.address,
  phone: siteInfo.phone,
  email: siteInfo.email,
  availability: siteInfo.officeHours,
  googleMapEmbedUrl: siteInfo.googleMapEmbedUrl,
  googleMapDirectionUrl: siteInfo.googleMapDirectionUrl,
};

export const contactFormConfig: ContactFormConfig = {
  title: "Send Me a Message",
  description: "Fill out the form and I'll get back to you shortly.",
  submitLabel: "Send Message",
};

export const guidanceCtaData: GuidanceCtaData = {
  eyebrow: "NEED ACADEMIC GUIDANCE?",
  title: "I'm here to help you succeed!",
  description: "From course selection to admission guidance — let's achieve your goals together.",
  primaryButtonText: "Call Sir Now",
  primaryButtonHref: `tel:${siteInfo.phone.replace(/[\s-]/g, "")}`,
  secondaryButtonText: "Browse Courses",
  secondaryButtonHref: "#courses",
};

export const trustHighlightsData: TrustHighlightItem[] = [
  { id: "th1", title: "Response within 24 hours", iconName: "Clock" },
  { id: "th2", title: "Trusted by 1000+ Students", iconName: "Users" },
  { id: "th3", title: "Personalized Guidance", iconName: "UserCheck" },
  { id: "th4", title: "Admission Support", iconName: "GraduationCap" },
];
