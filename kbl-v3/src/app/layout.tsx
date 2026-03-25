import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TopNav } from "@/components/TopNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "G11 | IPL Fantasy League",
  description: "Unified, automated, and scalable fantasy league platform for the IPL. Experience premium team selection and relative ranking algorithms.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        <TopNav user={user} />
        <main style={{ minHeight: 'calc(100vh - 72px)' }}>
          {children}
        </main>
        <ThemeToggle />
      </body>
    </html>
  );
}
