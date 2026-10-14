import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tech Explorer — Khám phá phần cứng",
  description:
    "Khám phá phần cứng, tìm hiểu linh kiện và xây dựng cấu hình PC tương tác.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
