import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const base = host ? new URL(`${protocol}://${host}`) : undefined;
  const title = "Central Kadett 94 — Computador de bordo pessoal";
  const description = "Central local-first para organizar a manutenção, os gastos e a história de um Chevrolet Kadett GLS 1.8 EFI 1994.";
  return {
    metadataBase: base,
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", locale: "pt_BR", images: base ? [new URL("/og.png", base).toString()] : undefined },
    twitter: { card: "summary_large_image", title, description, images: base ? [new URL("/og.png", base).toString()] : undefined },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
