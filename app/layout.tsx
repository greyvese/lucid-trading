import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  return {
    metadataBase: new URL(baseUrl),
    title: "Lucid Journal — Trade with clarity",
    description: "A calm, modern trading journal for tracking every setup, risk decision, result, and lesson.",
    openGraph: {
      title: "Lucid Journal — Trade with clarity",
      description: "A liquid-glass trading journal with a performance calendar and clear risk tracking.",
      images: [{ url: `${baseUrl}/og.png`, width: 1536, height: 1024, alt: "Lucid Journal trading dashboard" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Lucid Journal — Trade with clarity",
      description: "A liquid-glass trading journal with a performance calendar and clear risk tracking.",
      images: [`${baseUrl}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
