import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { getGlobalSettings } from "@/features/website-cms/actions/global-settings";
import { SiteSettingsProvider } from "@/lib/providers/SiteSettingsProvider";
import { Toaster } from "react-hot-toast";
import { InitialSplashLoader } from "@/components/common/InitialSplashLoader";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteInfo = await getGlobalSettings();

  return {
    title: siteInfo.coachingCenterName,
    description: siteInfo.shortDescription,
    keywords: [
      siteInfo.coachingCenterName.split(" - ")[0],
      `${siteInfo.teacherName.split(" ").pop()} Sir Coaching`,
      siteInfo.teacherName,
      "Physics Coaching Chattogram",
      "Mathematics Admission Care",
      "BUET Admission Care",
      "CUET Admission Care",
      `Coaching center ${siteInfo.address.split(",").reverse()[2]?.trim() || "Rangunia"}`
    ],
    authors: [{ name: siteInfo.teacherName }],
    openGraph: {
      title: siteInfo.coachingCenterName,
      description: `Premium personal coaching program specialized in Physics and Higher Mathematics by ${siteInfo.teacherName.split(" ").pop()} Sir.`,
      type: "website",
      locale: "en_US",
      siteName: siteInfo.coachingCenterName.split(" - ")[0],
    }
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getGlobalSettings();

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full scroll-smooth antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg-soft font-sans" suppressHydrationWarning>
        <SiteSettingsProvider settings={settings}>
          <InitialSplashLoader />
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
