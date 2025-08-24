import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";
import CatTriangle from "./components/sync/sync";
import FocusOverlay from './components/focus/focus';
import YouTubePlaylistStreamer from './components/sync/music';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "9 Lives",
  description: "9 Lives",
  icons: {
    icon: "/favicon.png", 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // You can set different playlist IDs based on environment or user preference
  const playlistId = "PLPOTS-vqkh7b4SN88fwYrCqEWxvOKkk1H";
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CatTriangle />
        {children}
        <FocusOverlay autoStart={true} />
        <YouTubePlaylistStreamer playlistId={playlistId} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}