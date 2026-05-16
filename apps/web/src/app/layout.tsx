import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowMail — AI-Powered Email Marketing",
  description: "Transactional email API + no-code visual flow builder with AI deliverability scoring.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const agencyLogo = headerList.get("x-agency-logo");
  const agencyColor = headerList.get("x-agency-color");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={agencyColor ? { "--brand-primary": agencyColor } as React.CSSProperties : undefined}
    >
      <head>
        {agencyLogo && <link rel="icon" href={agencyLogo} />}
      </head>
      <body className="min-h-full flex flex-col">
        {agencyLogo && (
          <div className="p-4 border-b bg-white flex items-center gap-2">
             <img src={agencyLogo} alt="Agency Logo" className="h-8 w-auto" />
             <span className="font-bold text-lg">FlowMail Agency</span>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
