import { Inter } from "next/font/google";
import "./globals.css";
import { JsonLd } from "../components/JsonLd";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://abdullahgym1.online";
const SITE_NAME = "Abdullah Gym 1";
const SITE_DESCRIPTION =
  "Abdullah Gym 1 — Best Ladies & Gents Fitness Center in Gujranwala. Separate dedicated shifts, certified personal trainers, weight training, cardio, bodybuilding & custom diet plans. Located on Sialkot Road near Jagna Bazar, Rajput Colony, Gujranwala. Join now!";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Abdullah Gym 1 | Best Ladies & Gents Gym in Gujranwala",
    template: "%s | Abdullah Gym 1 — Gym Gujranwala",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    // Core brand
    "Abdullah Gym 1",
    "Abdullah Gym Gujranwala",
    "Abdullah Gym 1 Gujranwala",

    // Generic gym — Gujranwala
    "gym in Gujranwala",
    "best gym in Gujranwala",
    "gyms in Gujranwala",
    "top gym Gujranwala",
    "gym near me Gujranwala",
    "fitness center Gujranwala",
    "fitness club Gujranwala",
    "workout gym Gujranwala",

    // Ladies specific
    "ladies gym Gujranwala",
    "ladies fitness center Gujranwala",
    "female gym Gujranwala",
    "women gym Gujranwala",
    "girls gym Gujranwala",
    "ladies only gym Gujranwala",
    "private ladies gym Gujranwala",
    "ladies workout center Gujranwala",
    "ladies gym near me Gujranwala",
    "ladies gym with privacy Gujranwala",
    "pardah ladies gym Gujranwala",

    // Gents specific
    "gents gym Gujranwala",
    "men gym Gujranwala",
    "boys gym Gujranwala",
    "male fitness center Gujranwala",

    // Services
    "personal trainer Gujranwala",
    "personal training Gujranwala",
    "certified trainer Gujranwala",
    "bodybuilding gym Gujranwala",
    "weight training Gujranwala",
    "strength training Gujranwala",
    "powerlifting gym Gujranwala",
    "cardio gym Gujranwala",
    "HIIT training Gujranwala",
    "weight loss gym Gujranwala",
    "fat loss gym Gujranwala",
    "muscle building gym Gujranwala",
    "hypertrophy gym Gujranwala",
    "diet plans Gujranwala",
    "nutrition plans Gujranwala",
    "sports nutrition Gujranwala",
    "gym membership Gujranwala",
    "gym packages Gujranwala",
    "beginner gym Gujranwala",

    // Location specific
    "gym near Sialkot Road Gujranwala",
    "gym near Jagna Bazar Gujranwala",
    "gym Rajput Colony Gujranwala",
    "gym Sialkot Road Gujranwala",
    "gym near Jagna Bazar",
    "gym near Rajput Colony",
    "Sialkot Road gym",

    // Trainer names
    "Rana Irfan trainer Gujranwala",
    "Rana Irfan Mr Champion Gujranwala",
    "Mr Champion Gujranwala bodybuilder",
    "Rana Ibrar trainer Gujranwala",

    // Long-tail intent
    "best gym for ladies in Gujranwala",
    "gym with separate timings for ladies gents Gujranwala",
    "gym with privacy for women Gujranwala",
    "affordable gym Gujranwala",
    "professional gym Gujranwala",
    "gym for beginners Gujranwala",
    "gym with personal trainer Gujranwala",
    "24 hour gym Gujranwala",
    "gym with diet plan Gujranwala",
    "certified bodybuilding trainer Gujranwala",

    // Pakistan-wide discovery
    "gym in Punjab Pakistan",
    "ladies gym Punjab Pakistan",
    "fitness center Punjab",
    "best gym Pakistan Gujranwala",
  ],
  authors: [{ name: "Abdullah Gym 1" }],
  creator: "Codeinntech",
  publisher: "Abdullah Gym 1",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Abdullah Gym 1 | Best Ladies & Gents Gym in Gujranwala",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/assets/icons/logo.png",
        width: 512,
        height: 512,
        alt: "Abdullah Gym 1 — Best Gym in Gujranwala for Ladies & Gents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Abdullah Gym 1 | Best Ladies & Gents Gym in Gujranwala",
    description: SITE_DESCRIPTION,
    images: ["/assets/icons/logo.png"],
    creator: "@abdullahgym1",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/assets/icons/logo.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: "",
  },
  category: "fitness",
  classification: "Health & Fitness",
  referrer: "origin-when-cross-origin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-PK" suppressHydrationWarning>
      <body className={inter.variable}>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
