import { LayoutGrid, Wallet, Users } from "lucide-react";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/chits", label: "Chits", icon: Wallet },
  { href: "/dashboard/members", label: "Members", icon: Users },
] as const;
