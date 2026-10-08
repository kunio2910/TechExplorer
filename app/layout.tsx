import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tech Explorer — Inside the technology",
  description:
    "Explore motherboard components, specifications and PC compatibility interactively.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
