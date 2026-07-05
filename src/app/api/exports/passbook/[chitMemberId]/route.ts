import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildPassbookExcel, buildPassbookPdf } from "@/lib/exports/passbook";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chitMemberId: string }> }
) {
  const { chitMemberId } = await params;
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "excel";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const chitMember = await prisma.chitMember.findFirst({
    where: { id: chitMemberId, chit: { ownerId: user.id } },
    include: {
      member: true,
      chit: true,
      payments: true,
    },
  });
  if (!chitMember) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auctions = await prisma.monthlyAuction.findMany({
    where: { chitId: chitMember.chitId },
    orderBy: { monthIndex: "asc" },
    include: { calculation: true },
  });

  const paymentsByAuction = new Map(chitMember.payments.map((p) => [p.monthlyAuctionId, p]));

  const data = {
    chitName: chitMember.chit.name,
    memberName: chitMember.member.name,
    memberPhone: chitMember.member.phone,
    prized: chitMember.prized,
    prizedMonth: chitMember.prizedMonth,
    rows: auctions.map((a) => {
      const payment = paymentsByAuction.get(a.id);
      return {
        monthIndex: a.monthIndex,
        monthLabel: a.monthLabel,
        status: a.status,
        payablePerPerson: a.calculation ? a.calculation.payablePerPerson.toString() : null,
        amountPaid: payment ? payment.amountPaid.toString() : null,
        paid: payment?.paid ?? false,
      };
    }),
  };

  const safeName = chitMember.member.name.replace(/[^a-z0-9]+/gi, "-");

  if (format === "pdf") {
    const buffer = await buildPassbookPdf(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="passbook-${safeName}.pdf"`,
      },
    });
  }

  const buffer = await buildPassbookExcel(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="passbook-${safeName}.xlsx"`,
    },
  });
}
