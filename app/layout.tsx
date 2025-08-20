import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CatTriangle from "./components/audio/sync";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

async function checkAuth() {
  const cookieStore = await cookies();
  
  // Check for authentication cookies from the login API
  const accessToken = cookieStore.get('supabase-access-token');
  const refreshToken = cookieStore.get('supabase-refresh-token');
  const userId = cookieStore.get('supabase-user-id');
  const userEmail = cookieStore.get('supabase-user-email');
  
  // Alternative check for client-side cookies
  const clientAccessToken = cookieStore.get('client-access-token');
  const clientUserId = cookieStore.get('client-user-id');
  
  // User is authenticated if they have either server-side or client-side tokens
  const isAuthenticated = (accessToken && userId) || (clientAccessToken && clientUserId);
  
  return {
    isAuthenticated: !!isAuthenticated,
    userId: userId?.value || clientUserId?.value,
    userEmail: userEmail?.value || cookieStore.get('client-user-email')?.value
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get current path to avoid redirecting on login page
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Don't check auth on login page or API routes
  const isLoginPage = pathname === '/login' || pathname.startsWith('/api/');
  
  if (!isLoginPage) {
    const authStatus = await checkAuth();
    
    if (!authStatus.isAuthenticated) {
      redirect('/login');
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CatTriangle />
        {children}
      </body>
    </html>
  );
}