"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { ArweaveProvider } from "@/context/ArweaveContext";
import { VaultProvider } from "@/context/VaultContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange
    >
      <ArweaveProvider>
        <VaultProvider>{children}</VaultProvider>
      </ArweaveProvider>
    </ThemeProvider>
  );
}
