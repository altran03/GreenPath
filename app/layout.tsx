import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Use CSS variables for fonts so build works offline (Docker/sandbox). Same visual stack:
// heading ≈ Instrument Serif, body ≈ DM Sans. Defined in globals.css.
export const metadata: Metadata = {
  title: "GreenPath — Your Personalized Green Finance Roadmap",
  description:
    "Discover which green investments you can afford based on your credit profile. AI-powered, personalized, and actionable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
