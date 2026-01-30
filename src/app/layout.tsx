import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ServiceWorkerRegistration } from "@/components/providers/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Healthy Habits Tracker",
  description: "Track your daily habits, mood, and activities with your friends",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Habits",
  },
};

export const viewport: Viewport = {
  themeColor: "#9333ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
