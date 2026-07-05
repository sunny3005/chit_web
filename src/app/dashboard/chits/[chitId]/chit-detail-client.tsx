"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Users,
  Trash2,
  Pencil,
  Crown,
  BookOpen,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateChitMembers,
  updateChitStatus,
  updateChitDetails,
  deleteChit,
} from "@/lib/chits/actions";
import { formatCurrency, MONTH_NAMES } from "@/lib/format";

type Member = { id: string; name: string; phone: string };
type ChitMemberRow = Member & {
  chitMemberId: string;
  prized: boolean;
  prizedMonth: number | null;
};
type Calculation = {
  interestPercent: string;
  chitAmount: string;
  commissionPercent: string;
  auctionAmount: string;
  agentCommission: string;
  netAmount: string;
  dividend: string;
  dividendPerMember: string;
  payablePerPerson: string;
};
type Auction = {
  id: string;
  monthIndex: number;
  monthLabel: string;
  status: "PENDING" | "AUCTION_DONE" | "COMPLETED";
  calculation: Calculation | null;
};
type ChitDetail = {
  id: string;
  name: string;
  totalAmount: string;
  numberOfMonths: number;
  numberOfMembers: number;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  members: ChitMemberRow[];
  auctions: Auction[];
  startMonth: number | null;
  startYear: number | null;
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

const editChitSchema = z.object({
  name: z.string().trim().min(2, "Chit name is required"),
  totalAmount: z.number().positive("Total amount must be positive"),
  numberOfMonths: z.number().int().min(2, "Must run at least 2 months"),
  description: z.string().trim().optional().or(z.literal("")),
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int(),
});
type EditChitValues = z.infer<typeof editChitSchema>;

function EditChitDialog({
  chit,
  open,
  onOpenChange,
}: {
  chit: ChitDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const form = useForm<EditChitValues>({
    resolver: zodResolver(editChitSchema),
    values: {
      name: chit.name,
      totalAmount: Number(chit.totalAmount),
      numberOfMonths: chit.numberOfMonths,
      description: chit.description ?? "",
      startMonth: chit.startMonth ?? now.getMonth() + 1,
      startYear: chit.startYear ?? now.getFullYear(),
    },
  });

  async function onSubmit(values: EditChitValues) {
    setSubmitting(true);
    const result = await updateChitDetails(chit.id, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Chit updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Chit</DialogTitle>
          <DialogDescription>
            Update chit details. Months with recorded auctions can&apos;t be
            removed.
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
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
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABEL: Record<Auction["status"], string> = {
  PENDING: "Pending",
  AUCTION_DONE: "Auction Done",
  COMPLETED: "Completed",
};

const STATUS_VARIANT: Record<
  Auction["status"],
  "secondary" | "default" | "outline"
> = {
  PENDING: "secondary",
  AUCTION_DONE: "default",
  COMPLETED: "outline",
};

function ManageMembersDialog({
  chitId,
  numberOfMembers,
  currentMembers,
  allMembers,
  open,
  onOpenChange,
}: {
  chitId: string;
  numberOfMembers: number;
  currentMembers: Member[];
  allMembers: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    currentMembers.map((m) => m.id)
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSave() {
    setSubmitting(true);
    const result = await updateChitMembers(chitId, selectedIds);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Members updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
          <DialogDescription>
            Select up to {numberOfMembers} members for this chit (
            {selectedIds.length} selected).
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border p-2">
          {allMembers.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">
              No members available.
            </p>
          ) : (
            allMembers.map((member) => {
              const checked = selectedIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      const isChecked = value === true;
                      setSelectedIds((prev) =>
                        isChecked
                          ? [...prev, member.id]
                          : prev.filter((id) => id !== member.id)
                      );
                    }}
                  />
                  <span>{member.name}</span>
                  <span className="text-muted-foreground">{member.phone}</span>
                </label>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700"
            onClick={onSave}
          >
            {submitting ? "Saving..." : "Save Members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteChitButton({ chitId, chitName }: { chitId: string; chitName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteChit(chitId);
    setDeleting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Chit deleted.");
    router.push("/dashboard/chits");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <Trash2 className="text-destructive" /> Delete Chit
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {chitName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this chit, its members, and all
            auction records. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} onClick={onDelete}>
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusToggle({
  chitId,
  status,
}: {
  chitId: string;
  status: "ACTIVE" | "INACTIVE";
}) {
  const [current, setCurrent] = useState(status);
  const [submitting, setSubmitting] = useState(false);

  async function onToggle() {
    const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setSubmitting(true);
    const result = await updateChitStatus(chitId, next);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setCurrent(next);
    toast.success(`Chit marked ${next.toLowerCase()}.`);
  }

  return (
    <Button variant="outline" size="sm" disabled={submitting} onClick={onToggle}>
      Mark {current === "ACTIVE" ? "Inactive" : "Active"}
    </Button>
  );
}

export function ChitDetailClient({
  chit,
  allMembers,
}: {
  chit: ChitDetail;
  allMembers: Member[];
}) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{chit.name}</h1>
            <Badge variant={chit.status === "ACTIVE" ? "default" : "secondary"}>
              {chit.status}
            </Badge>
          </div>
          {chit.description && (
            <p className="mt-1 text-muted-foreground">{chit.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/exports/chit-report/${chit.id}?format=excel`} download />
            }
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/exports/chit-report/${chit.id}?format=pdf`} download />
            }
          >
            <FileText className="size-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit Chit
          </Button>
          <StatusToggle chitId={chit.id} status={chit.status} />
          <DeleteChitButton chitId={chit.id} chitName={chit.name} />
        </div>
      </div>

      <EditChitDialog chit={chit} open={editOpen} onOpenChange={setEditOpen} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-red-600">
            {formatCurrency(chit.totalAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {chit.numberOfMonths} months
            {chit.startMonth && chit.startYear && (
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                Starts {MONTH_NAMES[chit.startMonth - 1]} {chit.startYear}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              Members
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setMembersOpen(true)}
              >
                <Users />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {chit.members.length}/{chit.numberOfMembers}
          </CardContent>
        </Card>
      </div>

      <ManageMembersDialog
        chitId={chit.id}
        numberOfMembers={chit.numberOfMembers}
        currentMembers={chit.members}
        allMembers={allMembers}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />

      {chit.members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Passbook</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chit.members.map((member) => (
                  <TableRow key={member.chitMemberId}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>
                      {member.prized ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                        >
                          <Crown className="size-3" />
                          Prized{member.prizedMonth ? ` (Month ${member.prizedMonth})` : ""}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Not yet prized
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            href={`/dashboard/chits/${chit.id}/members/${member.chitMemberId}`}
                          />
                        }
                      >
                        <BookOpen className="size-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Auctions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auction Amount</TableHead>
                <TableHead>Payable/Person</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chit.auctions.map((auction) => (
                <TableRow key={auction.id}>
                  <TableCell className="font-medium">
                    {auction.monthLabel}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[auction.status]}>
                      {STATUS_LABEL[auction.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {auction.calculation
                      ? formatCurrency(auction.calculation.auctionAmount)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {auction.calculation
                      ? formatCurrency(auction.calculation.payablePerPerson)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link
                          href={`/dashboard/chits/${chit.id}/auctions/${auction.id}`}
                        />
                      }
                    >
                      {auction.calculation ? "View" : "Run Auction"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
