"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Search, Wallet, Users, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FadeIn } from "@/components/shared/fade-in";
import { createChit } from "@/lib/chits/actions";
import { formatCurrency, MONTH_NAMES } from "@/lib/format";

export type ChitRow = {
  id: string;
  name: string;
  totalAmount: string;
  numberOfMonths: number;
  numberOfMembers: number;
  memberCount: number;
  status: "ACTIVE" | "INACTIVE";
  startMonth: number | null;
  startYear: number | null;
  endMonth: number | null;
  endYear: number | null;
};

export type MemberOption = { id: string; name: string; phone: string };

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

const schema = z.object({
  name: z.string().trim().min(2, "Chit name is required"),
  totalAmount: z.number().positive("Total amount must be positive"),
  numberOfMonths: z.number().int().min(2, "Must run at least 2 months"),
  numberOfMembers: z.number().int().min(2, "Must have at least 2 members"),
  description: z.string().trim().optional().or(z.literal("")),
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int(),
  memberIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

function formatMonthYear(month: number | null, year: number | null) {
  if (!month || !year) return null;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function CreateChitDialog({
  members,
  open,
  onOpenChange,
}: {
  members: MemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      totalAmount: 0,
      numberOfMonths: 12,
      numberOfMembers: 12,
      description: "",
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
      memberIds: [],
    },
  });

  const selectedIds = form.watch("memberIds");
  const startMonth = form.watch("startMonth");
  const startYear = form.watch("startYear");
  const numberOfMonths = form.watch("numberOfMonths");

  const endLabel = useMemo(() => {
    if (!startMonth || !startYear || !numberOfMonths) return null;
    const totalIndex = startMonth - 1 + numberOfMonths - 1;
    const endMonth = (totalIndex % 12) + 1;
    const endYear = startYear + Math.floor(totalIndex / 12);
    return `${MONTH_NAMES[endMonth - 1]} ${endYear}`;
  }, [startMonth, startYear, numberOfMonths]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await createChit(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Chit created.");
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Chit</DialogTitle>
          <DialogDescription>
            Set up a new chit fund and assign members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chit name</FormLabel>
                  <FormControl>
                    <Input placeholder="Family Chit 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Months</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Members</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start month</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_NAMES.map((name, i) => (
                          <SelectItem key={name} value={String(i + 1)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start year</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {YEAR_OPTIONS.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {endLabel && (
              <p className="text-sm text-muted-foreground">
                Runs {MONTH_NAMES[startMonth - 1]} {startYear} &rarr; {endLabel}
              </p>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes about this chit..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Assign members ({selectedIds.length} selected)
                  </FormLabel>
                  <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border p-2">
                    {members.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">
                        No members yet. Add members first.
                      </p>
                    ) : (
                      members.map((member) => {
                        const checked = field.value.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                const isChecked = value === true;
                                field.onChange(
                                  isChecked
                                    ? [...field.value, member.id]
                                    : field.value.filter((id) => id !== member.id)
                                );
                              }}
                            />
                            <span>{member.name}</span>
                            <span className="text-muted-foreground">
                              {member.phone}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? "Creating..." : "Create Chit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function ChitsClient({
  chits,
  members,
}: {
  chits: ChitRow[];
  members: MemberOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chits.filter((chit) => {
      const matchesQuery = q ? chit.name.toLowerCase().includes(q) : true;
      const matchesStatus =
        statusFilter === "ALL" ? true : chit.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [chits, query, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chits"
        description={`${chits.length} chit${chits.length === 1 ? "" : "s"} under management`}
        actions={
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" /> Create Chit
          </Button>
        }
      />

      <CreateChitDialog
        members={members}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {chits.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Wallet}
              title="No chits yet"
              description="Create your first chit fund to start tracking members and monthly auctions."
              action={
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" /> Create Chit
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chits by name..."
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Search}
                  title="No matches found"
                  description="Try a different search term or filter."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((chit, i) => {
                const progress = Math.round(
                  (chit.memberCount / chit.numberOfMembers) * 100
                );
                return (
                  <FadeIn key={chit.id} delay={Math.min(i * 0.03, 0.3)}>
                    <Link href={`/dashboard/chits/${chit.id}`}>
                      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardContent className="flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold">{chit.name}</h3>
                            <Badge
                              variant={
                                chit.status === "ACTIVE" ? "default" : "secondary"
                              }
                            >
                              {chit.status}
                            </Badge>
                          </div>
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(chit.totalAmount)}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarClock className="size-3.5" />
                              {formatMonthYear(chit.startMonth, chit.startYear) &&
                              formatMonthYear(chit.endMonth, chit.endYear)
                                ? `${formatMonthYear(chit.startMonth, chit.startYear)} → ${formatMonthYear(chit.endMonth, chit.endYear)}`
                                : `${chit.numberOfMonths} months`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="size-3.5" />
                              {chit.memberCount}/{chit.numberOfMembers}
                            </span>
                          </div>
                          <Progress value={progress} />
                        </CardContent>
                      </Card>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
