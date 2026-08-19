import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/components/cart/CartContext";
import { Toaster } from "react-hot-toast";
import SessionProviderWrapper from "@/components/auth/SessionProviderWrapper";

const poppins = localFont({
  src: [
    { path: "../fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Poppins-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const lora = localFont({
  src: [{ path: "../fonts/Lora-Variable.ttf", weight: "400 700", style: "normal" }],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Novelty Prints — Personalized Gifts & Custom Printing",
    template: "%s | The Novelty Prints",
  },
  description:
    "Made personal. Made memorable. Personalized gifts, custom printing and bulk gifting from The Novelty Prints — Pan India delivery.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "The Novelty Prints",
    description: "Made personal. Made memorable.",
    siteName: "The Novelty Prints",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-navy">
        <SessionProviderWrapper>
          <CartProvider>
            <Navbar />
            <main className="min-h-[60vh] flex-1">{children}</main>
            <Footer />
            <Toaster position="bottom-center" />
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
