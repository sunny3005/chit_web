import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ChitDetailClient } from "./chit-detail-client";

export default async function ChitDetailPage({
  params,
}: {
  params: Promise<{ chitId: string }>;
}) {
  const { chitId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [chit, allMembers] = await Promise.all([
    prisma.chit.findFirst({
      where: { id: chitId, ownerId: user.id },
      include: {
        chitMembers: { include: { member: true }, orderBy: { joinedAt: "asc" } },
        monthlyAuctions: {
          orderBy: { monthIndex: "asc" },
          include: { calculation: true },
        },
      },
    }),
    prisma.member.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!chit) {
    notFound();
  }

  return (
    <ChitDetailClient
      chit={{
        id: chit.id,
        name: chit.name,
        totalAmount: chit.totalAmount.toString(),
        numberOfMonths: chit.numberOfMonths,
        numberOfMembers: chit.numberOfMembers,
        description: chit.description,
        status: chit.status,
        startMonth: chit.startMonth,
        startYear: chit.startYear,
        members: chit.chitMembers.map((cm) => ({
          id: cm.member.id,
          name: cm.member.name,
          phone: cm.member.phone,
        })),
        auctions: chit.monthlyAuctions.map((a) => ({
          id: a.id,
          monthIndex: a.monthIndex,
          monthLabel: a.monthLabel,
          status: a.status,
          calculation: a.calculation
            ? {
                interestPercent: a.calculation.interestPercent.toString(),
                chitAmount: a.calculation.chitAmount.toString(),
                commissionPercent: a.calculation.commissionPercent.toString(),
                auctionAmount: a.calculation.auctionAmount.toString(),
                agentCommission: a.calculation.agentCommission.toString(),
                netAmount: a.calculation.netAmount.toString(),
                dividend: a.calculation.dividend.toString(),
                dividendPerMember: a.calculation.dividendPerMember.toString(),
                payablePerPerson: a.calculation.payablePerPerson.toString(),
              }
            : null,
        })),
      }}
      allMembers={allMembers.map((m) => ({ id: m.id, name: m.name, phone: m.phone }))}
    />
  );
}
