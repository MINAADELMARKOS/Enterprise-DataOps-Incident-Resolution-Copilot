import type { Metadata } from "next";
import "@fontsource-variable/orbitron";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/share-tech-mono/latin-400.css";
import Shell from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestiNator — DataOps Control Plane",
  description: "See the signal. Find the cause. Fix with confidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
