import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ChitsClient } from "./chits-client";

export default async function ChitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [chits, members] = await Promise.all([
    prisma.chit.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chitMembers: true } } },
    }),
    prisma.member.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ChitsClient
      chits={chits.map((c) => ({
        id: c.id,
        name: c.name,
        totalAmount: c.totalAmount.toString(),
        numberOfMonths: c.numberOfMonths,
        numberOfMembers: c.numberOfMembers,
        memberCount: c._count.chitMembers,
        status: c.status,
        startMonth: c.startMonth,
        startYear: c.startYear,
        endMonth: c.endMonth,
        endYear: c.endYear,
      }))}
      members={members.map((m) => ({ id: m.id, name: m.name, phone: m.phone }))}
    />
  );
}
