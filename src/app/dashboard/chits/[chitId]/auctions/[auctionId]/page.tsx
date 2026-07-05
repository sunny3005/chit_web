import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AuctionDetailClient } from "./auction-detail-client";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ chitId: string; auctionId: string }>;
}) {
  const { chitId, auctionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const auction = await prisma.monthlyAuction.findFirst({
    where: { id: auctionId, chitId, chit: { ownerId: user.id } },
    include: {
      chit: {
        include: {
          chitMembers: {
            include: { member: true },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
      calculation: true,
      payments: true,
      winner: { include: { member: true } },
    },
  });

  if (!auction) {
    notFound();
  }

  const paymentsByChitMember = new Map(
    auction.payments.map((p) => [p.chitMemberId, p])
  );

  return (
    <AuctionDetailClient
      chitId={chitId}
      chitName={auction.chit.name}
      chitAmount={auction.chit.totalAmount.toString()}
      numberOfMonths={auction.chit.numberOfMonths}
      numberOfMembers={auction.chit.numberOfMembers}
      auction={{
        id: auction.id,
        monthLabel: auction.monthLabel,
        status: auction.status,
        winnerChitMemberId: auction.winnerChitMemberId,
        winnerName: auction.winner?.member.name ?? null,
        calculation: auction.calculation
          ? {
              commissionPercent: auction.calculation.commissionPercent.toString(),
              auctionAmount: auction.calculation.auctionAmount.toString(),
              agentCommission: auction.calculation.agentCommission.toString(),
              netAmount: auction.calculation.netAmount.toString(),
              dividend: auction.calculation.dividend.toString(),
              dividendPerMember: auction.calculation.dividendPerMember.toString(),
              payablePerPerson: auction.calculation.payablePerPerson.toString(),
            }
          : null,
      }}
      members={auction.chit.chitMembers.map((cm) => {
        const payment = paymentsByChitMember.get(cm.id);
        return {
          chitMemberId: cm.id,
          name: cm.member.name,
          phone: cm.member.phone,
          amountPaid: payment ? payment.amountPaid.toString() : "0",
          paid: payment?.paid ?? false,
          prized: cm.prized,
          prizedMonth: cm.prizedMonth,
        };
      })}
    />
  );
}
