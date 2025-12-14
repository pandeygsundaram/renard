import React from "react";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/logo-Photoroom.png";

interface ExtensionLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function ExtensionLayout({
  children,
  title,
  subtitle,
}: ExtensionLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            {/* Logo or specialized icon */}
            <img src={logo} className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 px-4 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Connecting to <strong>Renard Context Engine</strong>
        </p>
      </div>
    </div>
  );
}
