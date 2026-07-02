import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "./dashboard-nav";
import { UserMenu } from "./user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile = await prisma.profile.findUnique({ where: { id: user.id } });

  if (!profile) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ?? user.email!;
    const phone =
      (user.user_metadata?.phone as string | undefined) ?? user.id;

    profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        fullName,
        email: user.email!,
        phone,
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-red-600"
            >
              <Wallet className="size-5" />
              Chits<span className="text-foreground">Manager</span>
            </Link>
            <DashboardNav />
          </div>
          <UserMenu fullName={profile.fullName} email={profile.email} />
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
