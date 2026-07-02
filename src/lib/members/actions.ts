"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/auth/actions";

const memberSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(10, "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
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

export async function createMember(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}): Promise<ActionResult> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ownerId = await requireUserId();
  const { name, phone, email, address, notes } = parsed.data;

  const existing = await prisma.member.findFirst({
    where: { ownerId, OR: [{ phone }, { name }] },
  });
  if (existing) {
    return { error: "A member with this name or phone already exists." };
  }

  await prisma.member.create({
    data: {
      ownerId,
      name,
      phone,
      email: email || null,
      address: address || null,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function updateMember(
  id: string,
  input: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  }
): Promise<ActionResult> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const ownerId = await requireUserId();
  const { name, phone, email, address, notes } = parsed.data;

  const member = await prisma.member.findFirst({ where: { id, ownerId } });
  if (!member) {
    return { error: "Member not found." };
  }

  const conflict = await prisma.member.findFirst({
    where: { ownerId, id: { not: id }, OR: [{ phone }, { name }] },
  });
  if (conflict) {
    return { error: "Another member with this name or phone already exists." };
  }

  await prisma.member.update({
    where: { id },
    data: {
      name,
      phone,
      email: email || null,
      address: address || null,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  const ownerId = await requireUserId();

  const member = await prisma.member.findFirst({ where: { id, ownerId } });
  if (!member) {
    return { error: "Member not found." };
  }

  await prisma.member.delete({ where: { id } });

  revalidatePath("/dashboard/members");
  return { success: true };
}
