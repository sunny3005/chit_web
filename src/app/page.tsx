import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Users,
    title: "Member Management",
    description: "Track every chit member's details in one organized place.",
  },
  {
    icon: TrendingUp,
    title: "Auction Calculations",
    description: "Accurate monthly auction math, done automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Your chit data is protected with modern authentication.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-red-600">
            Chits<span className="text-foreground">Manager</span>
          </span>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" render={<Link href="/login" />}>
              Login
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              render={<Link href="/signup" />}
            >
              Get Started
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Run your chit funds
            <span className="text-red-600"> without the spreadsheets.</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Setup chits, manage members, run monthly auctions, and share
            results instantly — all from one simple dashboard.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700"
              render={<Link href="/signup" />}
            >
              Create Free Account <ArrowRight className="ml-1 size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              I already have an account
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-950">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Chits Manager. All rights reserved.
      </footer>
    </div>
  );
}
