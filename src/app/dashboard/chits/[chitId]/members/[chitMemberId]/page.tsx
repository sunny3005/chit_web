import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PassbookClient } from "./passbook-client";

export default async function MemberPassbookPage({
  params,
}: {
  params: Promise<{ chitId: string; chitMemberId: string }>;
}) {
  const { chitId, chitMemberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const chitMember = await prisma.chitMember.findFirst({
    where: { id: chitMemberId, chitId, chit: { ownerId: user.id } },
    include: {
      member: true,
      chit: true,
      payments: { include: { monthlyAuction: true } },
    },
  });

  if (!chitMember) {
    notFound();
  }

  const auctions = await prisma.monthlyAuction.findMany({
    where: { chitId },
    orderBy: { monthIndex: "asc" },
    include: { calculation: true },
  });

  const paymentsByAuction = new Map(
    chitMember.payments.map((p) => [p.monthlyAuctionId, p])
  );

  return (
    <PassbookClient
      chitId={chitId}
      chitMemberId={chitMemberId}
      chitName={chitMember.chit.name}
      memberName={chitMember.member.name}
      memberPhone={chitMember.member.phone}
      prized={chitMember.prized}
      prizedMonth={chitMember.prizedMonth}
      rows={auctions.map((a) => {
        const payment = paymentsByAuction.get(a.id);
        return {
          monthIndex: a.monthIndex,
          monthLabel: a.monthLabel,
          status: a.status,
          payablePerPerson: a.calculation
            ? a.calculation.payablePerPerson.toString()
            : null,
          amountPaid: payment ? payment.amountPaid.toString() : null,
          paid: payment?.paid ?? false,
        };
      })}
    />
  );
}
