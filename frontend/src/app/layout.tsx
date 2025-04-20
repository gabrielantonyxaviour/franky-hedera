import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/providers";
import Layout from "@/components/layout";
import { Toaster } from "@/components/ui/sonner"
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
        <Providers>
          <Layout>
            {children}
            <Toaster expand={true} />
          </Layout>
        </Providers>
      </body>
    </html>
  );
}