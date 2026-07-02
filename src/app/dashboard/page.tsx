import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, TrendingUp, Users, IndianRupee, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FadeIn } from "@/components/shared/fade-in";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [chitCount, memberCount, activeChits, recentChits] = await Promise.all([
    prisma.chit.count({ where: { ownerId: user.id } }),
    prisma.member.count({ where: { ownerId: user.id } }),
    prisma.chit.count({ where: { ownerId: user.id, status: "ACTIVE" } }),
    prisma.chit.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { chitMembers: true } } },
    }),
  ]);

  const totalValue = await prisma.chit.aggregate({
    where: { ownerId: user.id },
    _sum: { totalAmount: true },
  });

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <Card className="overflow-hidden bg-gradient-to-br from-red-600 to-red-700 text-white ring-0">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-red-100">{today}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Welcome back 👋
              </h1>
              <p className="mt-1 text-sm text-red-100">
                Here&apos;s what&apos;s happening with your chits today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="bg-white text-red-700 hover:bg-red-50"
                render={<Link href="/dashboard/chits" />}
              >
                <Plus className="size-4" /> New Chit
              </Button>
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                render={<Link href="/dashboard/members" />}
              >
                <Plus className="size-4" /> New Member
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Chits" value={chitCount} icon={Wallet} />
          <StatCard
            label="Active Chits"
            value={activeChits}
            icon={TrendingUp}
            accent="success"
          />
          <StatCard label="Members" value={memberCount} icon={Users} />
          <StatCard
            label="Total Chit Value"
            value={formatCurrency(totalValue._sum.totalAmount?.toString() ?? 0)}
            icon={IndianRupee}
            accent="warning"
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Chits</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard/chits" />}
            >
              View all <ArrowRight className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentChits.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No chits yet"
                description="Create your first chit fund to start tracking members and auctions."
                action={
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    render={<Link href="/dashboard/chits" />}
                  >
                    <Plus className="size-4" /> Create Chit
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col divide-y">
                {recentChits.map((chit) => (
                  <Link
                    key={chit.id}
                    href={`/dashboard/chits/${chit.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{chit.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {chit._count.chitMembers}/{chit.numberOfMembers} members
                        &middot; {chit.numberOfMonths} months
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-600">
                        {formatCurrency(chit.totalAmount.toString())}
                      </span>
                      <Badge
                        variant={
                          chit.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {chit.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
