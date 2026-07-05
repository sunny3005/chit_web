import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildChitReportExcel, buildChitReportPdf } from "@/lib/exports/chit-report";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chitId: string }> }
) {
  const { chitId } = await params;
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "excel";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const chit = await prisma.chit.findFirst({
    where: { id: chitId, ownerId: user.id },
    include: {
      chitMembers: true,
      monthlyAuctions: {
        orderBy: { monthIndex: "asc" },
        include: {
          calculation: true,
          winner: { include: { member: true } },
          payments: true,
        },
      },
    },
  });
  if (!chit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalMembers = chit.chitMembers.length;

  const data = {
    chitName: chit.name,
    totalAmount: chit.totalAmount.toString(),
    numberOfMonths: chit.numberOfMonths,
    numberOfMembers: chit.numberOfMembers,
    rows: chit.monthlyAuctions.map((a) => {
      const membersPaid = a.payments.filter((p) => p.paid).length;
      const collected = a.payments.reduce(
        (sum, p) => sum + (p.paid ? Number(p.amountPaid) : 0),
        0
      );
      return {
        monthLabel: a.monthLabel,
        status: a.status,
        auctionAmount: a.calculation ? a.calculation.auctionAmount.toString() : null,
        agentCommission: a.calculation ? a.calculation.agentCommission.toString() : null,
        payablePerPerson: a.calculation ? a.calculation.payablePerPerson.toString() : null,
        winnerName: a.winner?.member.name ?? null,
        membersPaid,
        totalMembers,
        collected: collected.toString(),
      };
    }),
  };

  const safeName = chit.name.replace(/[^a-z0-9]+/gi, "-");

  if (format === "pdf") {
    const buffer = await buildChitReportPdf(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${safeName}.pdf"`,
      },
    });
  }

  const buffer = await buildChitReportExcel(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report-${safeName}.xlsx"`,
    },
  });
}
