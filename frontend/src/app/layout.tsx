import "./globals.css";
import type { Metadata } from "next";
import ReownProviders from "@/components/ReownProviders";

export const metadata: Metadata = {
  title: "FRANKY",
  description: "Create custom AI agents with your spare mobile",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="sen">
        <ReownProviders>{children}</ReownProviders>
      </body>
    </html>
  );
}