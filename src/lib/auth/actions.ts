"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(10, "Enter a valid phone number"),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export type ActionResult = { error: string } | { success: true };

export async function signup(input: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { fullName, email, phone } = parsed.data;

  const existing = await prisma.profile.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existing) {
    return { error: "An account with this email or phone already exists." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { full_name: fullName, phone },
    },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return {
        error: "Too many verification emails sent. Please wait a few minutes and try again.",
      };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function verifySignupOtp(input: {
  email: string;
  token: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: "email",
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Invalid or expired code." };
  }

  return { success: true };
}

export async function setPassword(input: {
  password: string;
}): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "Your session expired. Please verify your code again." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { error: error.message };
  }

  const fullName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    authUser.email!;
  const phone = (authUser.user_metadata?.phone as string | undefined) ?? "";

  await prisma.profile.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      fullName,
      email: authUser.email!,
      phone,
    },
  });

  return { success: true };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const schema = z.object({
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  return { success: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
