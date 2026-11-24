import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "المكتب — مساحة عملك الافتراضية",
  description: "مساحة عمل عربية تجمع فريقك ومشاريعك وتواصلك في مكتب افتراضي واحد.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
