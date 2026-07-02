import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const members = await prisma.member.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <MembersClient
      members={members.map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        email: m.email,
        address: m.address,
        notes: m.notes,
      }))}
    />
  );
}
