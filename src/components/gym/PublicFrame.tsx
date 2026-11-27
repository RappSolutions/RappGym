import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logo from "@/assets/RappGym_1024.png";
import { Button } from "@/components/ui/button";
export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div lang="en" className="app-sheet mx-auto min-h-screen max-w-4xl">
      <header className="app-masthead flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/about" className="brand-wordmark flex items-center gap-2 font-display text-2xl">
          <img src={logo} alt="" className="size-10" />
          RappGym
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link to="/">Open app</Link>
        </Button>
      </header>
      <nav
        aria-label="RappGym"
        className="flex flex-wrap gap-x-5 gap-y-2 border-b px-4 py-3 text-sm"
      >
        <Link to="/about">Meet RappGym</Link>
        <Link to="/features">Features</Link>
        <Link to="/exercises">Exercises</Link>
        <Link to="/membership">Supporter</Link>
        <Link to="/privacy">Privacy</Link>
      </nav>
      <main className="space-y-8 px-4 py-8 sm:px-8">{children}</main>
      <footer className="flex flex-wrap justify-between gap-3 border-t px-4 py-5 text-xs text-muted-foreground">
        <span>Rapp Solutions AB · Sweden</span>
        <a
          href="https://jonasr.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Made by Jonas Rapp
        </a>
        <a href="mailto:gym@rappsol.com" className="underline">
          gym@rappsol.com
        </a>
      </footer>
    </div>
  );
}
