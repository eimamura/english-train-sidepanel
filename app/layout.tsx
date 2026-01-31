import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Learning Feedback Tool",
  description: "Ultra-fast feedback loop for English learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
