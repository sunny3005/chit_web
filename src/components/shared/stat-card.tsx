import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: "default" | "success" | "warning";
  className?: string;
}) {
  const accentClasses = {
    default: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    success:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  } as const;

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            accentClasses[accent]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-bold tracking-tight">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
