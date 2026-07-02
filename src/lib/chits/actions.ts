"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/auth/actions";
import { MONTH_NAMES } from "@/lib/format";
import { calculateAuction } from "@/lib/chits/calculation";

const chitSchema = z.object({
  name: z.string().trim().min(2, "Chit name is required"),
  totalAmount: z.coerce.number().positive("Total amount must be positive"),
  numberOfMonths: z.coerce
    .number()
    .int()
    .min(2, "Must run at least 2 months"),
  numberOfMembers: z.coerce
    .number()
    .int()
    .min(2, "Must have at least 2 members"),
  description: z.string().trim().optional().or(z.literal("")),
  startMonth: z.coerce.number().int().min(1).max(12).optional(),
  startYear: z.coerce.number().int().optional(),
  memberIds: z.array(z.string()).default([]),
});

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

export async function createChit(input: {
  name: string;
  totalAmount: number | string;
  numberOfMonths: number | string;
  numberOfMembers: number | string;
  description?: string;
  startMonth?: number;
  startYear?: number;
  memberIds: string[];
}): Promise<ActionResult> {
  const parsed = chitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ownerId = await requireUserId();
  const {
    name,
    totalAmount,
    numberOfMonths,
    numberOfMembers,
    description,
    startMonth,
    startYear,
    memberIds,
  } = parsed.data;

  if (memberIds.length > numberOfMembers) {
    return {
      error: `You selected ${memberIds.length} members, but this chit only allows ${numberOfMembers}.`,
    };
  }

  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, ownerId },
  });
  if (members.length !== memberIds.length) {
    return { error: "One or more selected members were not found." };
  }

  let endMonth: number | undefined;
  let endYear: number | undefined;
  if (startMonth && startYear) {
    const totalMonthIndex = startMonth - 1 + numberOfMonths - 1;
    endMonth = (totalMonthIndex % 12) + 1;
    endYear = startYear + Math.floor(totalMonthIndex / 12);
  }

  await prisma.chit.create({
    data: {
      ownerId,
      name,
      totalAmount,
      numberOfMonths,
      numberOfMembers,
      description: description || null,
      startMonth: startMonth ?? null,
      startYear: startYear ?? null,
      endMonth: endMonth ?? null,
      endYear: endYear ?? null,
      chitMembers: {
        create: memberIds.map((memberId) => ({ memberId })),
      },
      monthlyAuctions: {
        create: Array.from({ length: numberOfMonths }, (_, i) => ({
          monthIndex: i + 1,
          monthLabel: startMonth
            ? `${MONTH_NAMES[(startMonth - 1 + i) % 12]} ${
                (startYear ?? 0) + Math.floor((startMonth - 1 + i) / 12)
              }`
            : `Month ${i + 1}`,
        })),
      },
    },
  });

  revalidatePath("/dashboard/chits");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateChitMembers(
  chitId: string,
  memberIds: string[]
): Promise<ActionResult> {
  const ownerId = await requireUserId();

  const chit = await prisma.chit.findFirst({ where: { id: chitId, ownerId } });
  if (!chit) {
    return { error: "Chit not found." };
  }

  if (memberIds.length > chit.numberOfMembers) {
    return {
      error: `You selected ${memberIds.length} members, but this chit only allows ${chit.numberOfMembers}.`,
    };
  }

  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, ownerId },
  });
  if (members.length !== memberIds.length) {
    return { error: "One or more selected members were not found." };
  }

  await prisma.$transaction([
    prisma.chitMember.deleteMany({ where: { chitId } }),
    prisma.chitMember.createMany({
      data: memberIds.map((memberId) => ({ chitId, memberId })),
    }),
  ]);

  revalidatePath(`/dashboard/chits/${chitId}`);
  return { success: true };
}

export async function updateChitStatus(
  chitId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<ActionResult> {
  const ownerId = await requireUserId();

  const chit = await prisma.chit.findFirst({ where: { id: chitId, ownerId } });
  if (!chit) {
    return { error: "Chit not found." };
  }

  await prisma.chit.update({ where: { id: chitId }, data: { status } });

  revalidatePath(`/dashboard/chits/${chitId}`);
  revalidatePath("/dashboard/chits");
  return { success: true };
}

const chitDetailsSchema = z.object({
  name: z.string().trim().min(2, "Chit name is required"),
  totalAmount: z.coerce.number().positive("Total amount must be positive"),
  numberOfMonths: z.coerce.number().int().min(2, "Must run at least 2 months"),
  description: z.string().trim().optional().or(z.literal("")),
  startMonth: z.coerce.number().int().min(1).max(12).optional(),
  startYear: z.coerce.number().int().optional(),
});

function buildMonthLabel(
  startMonth: number | undefined,
  startYear: number | undefined,
  monthIndex: number
) {
  if (!startMonth || !startYear) return `Month ${monthIndex}`;
  const totalIndex = startMonth - 1 + monthIndex - 1;
  const month = (totalIndex % 12) + 1;
  const year = startYear + Math.floor(totalIndex / 12);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export async function updateChitDetails(
  chitId: string,
  input: {
    name: string;
    totalAmount: number | string;
    numberOfMonths: number | string;
    description?: string;
    startMonth?: number;
    startYear?: number;
  }
): Promise<ActionResult> {
  const parsed = chitDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ownerId = await requireUserId();

  const chit = await prisma.chit.findFirst({
    where: { id: chitId, ownerId },
    include: { monthlyAuctions: { orderBy: { monthIndex: "asc" } } },
  });
  if (!chit) {
    return { error: "Chit not found." };
  }

  const { name, totalAmount, numberOfMonths, description, startMonth, startYear } =
    parsed.data;

  if (numberOfMonths < chit.monthlyAuctions.length) {
    const removedMonths = chit.monthlyAuctions.slice(numberOfMonths);
    const hasProgress = removedMonths.some((m) => m.status !== "PENDING");
    if (hasProgress) {
      return {
        error: `Cannot reduce to ${numberOfMonths} months: month ${removedMonths.find((m) => m.status !== "PENDING")!.monthIndex} already has auction data. Delete that progress first.`,
      };
    }
  }

  let endMonth: number | undefined;
  let endYear: number | undefined;
  if (startMonth && startYear) {
    const totalMonthIndex = startMonth - 1 + numberOfMonths - 1;
    endMonth = (totalMonthIndex % 12) + 1;
    endYear = startYear + Math.floor(totalMonthIndex / 12);
  }

  const relabelOps = chit.monthlyAuctions
    .filter((m) => m.monthIndex <= numberOfMonths)
    .map((m) =>
      prisma.monthlyAuction.update({
        where: { id: m.id },
        data: { monthLabel: buildMonthLabel(startMonth, startYear, m.monthIndex) },
      })
    );

  const removeOps =
    numberOfMonths < chit.monthlyAuctions.length
      ? [
          prisma.monthlyAuction.deleteMany({
            where: { chitId, monthIndex: { gt: numberOfMonths } },
          }),
        ]
      : [];

  const addOps =
    numberOfMonths > chit.monthlyAuctions.length
      ? [
          prisma.monthlyAuction.createMany({
            data: Array.from(
              { length: numberOfMonths - chit.monthlyAuctions.length },
              (_, i) => {
                const monthIndex = chit.monthlyAuctions.length + i + 1;
                return {
                  chitId,
                  monthIndex,
                  monthLabel: buildMonthLabel(startMonth, startYear, monthIndex),
                };
              }
            ),
          }),
        ]
      : [];

  await prisma.$transaction([
    prisma.chit.update({
      where: { id: chitId },
      data: {
        name,
        totalAmount,
        numberOfMonths,
        description: description || null,
        startMonth: startMonth ?? null,
        startYear: startYear ?? null,
        endMonth: endMonth ?? null,
        endYear: endYear ?? null,
      },
    }),
    ...relabelOps,
    ...removeOps,
    ...addOps,
  ]);

  revalidatePath(`/dashboard/chits/${chitId}`);
  revalidatePath("/dashboard/chits");
  revalidatePath("/dashboard");
  return { success: true };
}

const auctionSchema = z.object({
  commissionPercent: z.coerce.number().min(0).max(100),
  auctionAmount: z.coerce.number().min(0),
});

export async function recordAuctionResult(
  monthlyAuctionId: string,
  input: {
    commissionPercent: number | string;
    auctionAmount: number | string;
  }
): Promise<ActionResult> {
  const parsed = auctionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ownerId = await requireUserId();

  const auction = await prisma.monthlyAuction.findFirst({
    where: { id: monthlyAuctionId, chit: { ownerId } },
    include: { chit: true },
  });
  if (!auction) {
    return { error: "Auction not found." };
  }

  const { commissionPercent, auctionAmount } = parsed.data;
  const chitAmount = Number(auction.chit.totalAmount);

  if (auctionAmount > chitAmount) {
    return { error: "Auction amount cannot exceed the chit amount." };
  }

  const result = calculateAuction({
    interestPercent: 0,
    chitAmount,
    totalMonths: auction.chit.numberOfMonths,
    commissionPercent,
    totalMembers: auction.chit.numberOfMembers,
    auctionAmount,
  });

  await prisma.$transaction([
    prisma.monthlyCalculation.upsert({
      where: { monthlyAuctionId },
      update: result,
      create: { monthlyAuctionId, ...result },
    }),
    prisma.monthlyAuction.update({
      where: { id: monthlyAuctionId },
      data: { status: "AUCTION_DONE" },
    }),
  ]);

  revalidatePath(`/dashboard/chits/${auction.chitId}`);
  revalidatePath(`/dashboard/chits/${auction.chitId}/auctions/${monthlyAuctionId}`);
  return { success: true };
}

export async function markAuctionCompleted(
  monthlyAuctionId: string
): Promise<ActionResult> {
  const ownerId = await requireUserId();

  const auction = await prisma.monthlyAuction.findFirst({
    where: { id: monthlyAuctionId, chit: { ownerId } },
  });
  if (!auction) {
    return { error: "Auction not found." };
  }
  if (auction.status !== "AUCTION_DONE") {
    return { error: "Record the auction result before marking it completed." };
  }

  await prisma.monthlyAuction.update({
    where: { id: monthlyAuctionId },
    data: { status: "COMPLETED" },
  });

  revalidatePath(`/dashboard/chits/${auction.chitId}`);
  revalidatePath(`/dashboard/chits/${auction.chitId}/auctions/${monthlyAuctionId}`);
  return { success: true };
}

export async function deleteChit(chitId: string): Promise<ActionResult> {
  const ownerId = await requireUserId();

  const chit = await prisma.chit.findFirst({ where: { id: chitId, ownerId } });
  if (!chit) {
    return { error: "Chit not found." };
  }

  await prisma.chit.delete({ where: { id: chitId } });

  revalidatePath("/dashboard/chits");
  revalidatePath("/dashboard");
  return { success: true };
}

const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0, "Amount cannot be negative"),
});

export async function saveMemberPayment(
  monthlyAuctionId: string,
  chitMemberId: string,
  input: { amountPaid: number | string }
): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ownerId = await requireUserId();

  const auction = await prisma.monthlyAuction.findFirst({
    where: { id: monthlyAuctionId, chit: { ownerId } },
  });
  if (!auction) {
    return { error: "Auction not found." };
  }

  const chitMember = await prisma.chitMember.findFirst({
    where: { id: chitMemberId, chitId: auction.chitId },
  });
  if (!chitMember) {
    return { error: "Member not found in this chit." };
  }

  const { amountPaid } = parsed.data;

  await prisma.memberPayment.upsert({
    where: {
      monthlyAuctionId_chitMemberId: { monthlyAuctionId, chitMemberId },
    },
    update: { amountPaid, paid: amountPaid > 0 },
    create: {
      monthlyAuctionId,
      chitMemberId,
      amountPaid,
      paid: amountPaid > 0,
    },
  });

  revalidatePath(`/dashboard/chits/${auction.chitId}/auctions/${monthlyAuctionId}`);
  return { success: true };
}
