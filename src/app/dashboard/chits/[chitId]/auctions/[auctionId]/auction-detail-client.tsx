"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Users,
  Check,
  Pencil,
  IndianRupee,
  Wallet,
  Percent,
  Crown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FadeIn } from "@/components/shared/fade-in";
import { StatCard } from "@/components/shared/stat-card";
import { ShareCalculation } from "@/components/shared/share-calculation";
import {
  recordAuctionResult,
  markAuctionCompleted,
  saveMemberPayment,
  setAuctionWinner,
  clearAuctionWinner,
} from "@/lib/chits/actions";
import { formatCurrency } from "@/lib/format";
import { buildAuctionShareMessage } from "@/lib/chits/share";

type Calculation = {
  commissionPercent: string;
  auctionAmount: string;
  agentCommission: string;
  netAmount: string;
  dividend: string;
  dividendPerMember: string;
  payablePerPerson: string;
};

export type MemberPaymentRow = {
  chitMemberId: string;
  name: string;
  phone: string;
  amountPaid: string;
  paid: boolean;
  prized: boolean;
  prizedMonth: number | null;
};

const schema = z.object({
  commissionPercent: z.number().min(0).max(100),
  auctionAmount: z.number().min(0),
});
type FormValues = z.infer<typeof schema>;

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{formatCurrency(value)}</span>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberPaymentRowItem({
  auctionId,
  member,
  suggestedAmount,
  onPaidChange,
}: {
  auctionId: string;
  member: MemberPaymentRow;
  suggestedAmount: string | null;
  onPaidChange: (paid: boolean, amount: number) => void;
}) {
  const [amount, setAmount] = useState(
    member.amountPaid !== "0" ? member.amountPaid : suggestedAmount ?? "0"
  );
  const [paid, setPaid] = useState(member.paid);
  const [editing, setEditing] = useState(!member.paid);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const result = await saveMemberPayment(auctionId, member.chitMemberId, {
      amountPaid: amount,
    });
    setSaving(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const isPaid = Number(amount) > 0;
    setPaid(isPaid);
    setEditing(false);
    onPaidChange(isPaid, Number(amount));
    toast.success(`Saved payment for ${member.name}.`);
  }

  const locked = paid && !editing;

  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-0">
      <Avatar size="sm">
        <AvatarFallback className="bg-red-600/10 text-xs font-semibold text-red-600">
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{member.name}</p>
          {member.prized && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              <Crown className="size-3" />
              Prized{member.prizedMonth ? ` M${member.prizedMonth}` : ""}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{member.phone}</p>
      </div>
      <Input
        type="number"
        min={0}
        value={amount}
        disabled={locked}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28"
      />
      {locked ? (
        <Button
          size="icon-sm"
          variant="secondary"
          onClick={() => setEditing(true)}
          title="Edit payment"
        >
          <Pencil />
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="outline"
          disabled={saving}
          onClick={onSave}
          title="Save payment"
        >
          <Check className={paid ? "text-emerald-600" : ""} />
        </Button>
      )}
    </div>
  );
}

export function AuctionDetailClient({
  chitId,
  chitName,
  chitAmount,
  auction,
  members,
}: {
  chitId: string;
  chitName: string;
  chitAmount: string;
  numberOfMonths: number;
  numberOfMembers: number;
  auction: {
    id: string;
    monthLabel: string;
    status: "PENDING" | "AUCTION_DONE" | "COMPLETED";
    calculation: Calculation | null;
    winnerChitMemberId: string | null;
    winnerName: string | null;
  };
  members: MemberPaymentRow[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [calculation, setCalculation] = useState(auction.calculation);
  const [status, setStatus] = useState(auction.status);
  const [winnerId, setWinnerId] = useState(auction.winnerChitMemberId);
  const [winnerName, setWinnerName] = useState(auction.winnerName);
  const [prizedMap, setPrizedMap] = useState(() =>
    new Map(members.map((m) => [m.chitMemberId, m.prized]))
  );
  const [winnerSubmitting, setWinnerSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState(() =>
    new Map(members.map((m) => [m.chitMemberId, { paid: m.paid, amount: Number(m.amountPaid) }]))
  );

  const eligibleMembers = members.filter(
    (m) => !prizedMap.get(m.chitMemberId) || m.chitMemberId === winnerId
  );

  async function onSelectWinner(chitMemberId: string) {
    setWinnerSubmitting(true);
    const result = await setAuctionWinner(auction.id, chitMemberId);
    setWinnerSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const member = members.find((m) => m.chitMemberId === chitMemberId);
    setWinnerId(chitMemberId);
    setWinnerName(member?.name ?? null);
    setPrizedMap((prev) => new Map(prev).set(chitMemberId, true));
    toast.success(`${member?.name} marked as this month's prized member.`);
  }

  async function onClearWinner() {
    if (!winnerId) return;
    setWinnerSubmitting(true);
    const result = await clearAuctionWinner(auction.id);
    setWinnerSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setPrizedMap((prev) => new Map(prev).set(winnerId, false));
    setWinnerId(null);
    setWinnerName(null);
    toast.success("Winner selection cleared.");
  }

  const paidCount = Array.from(paymentState.values()).filter((p) => p.paid).length;
  const totalCollected = Array.from(paymentState.values()).reduce(
    (sum, p) => sum + (p.paid ? p.amount : 0),
    0
  );
  const collectionProgress =
    members.length > 0 ? Math.round((paidCount / members.length) * 100) : 0;
  const expectedTotal = calculation
    ? Number(calculation.payablePerPerson) * members.length
    : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      commissionPercent: calculation ? Number(calculation.commissionPercent) : 5,
      auctionAmount: calculation ? Number(calculation.auctionAmount) : 0,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await recordAuctionResult(auction.id, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Auction result saved.");
    setStatus("AUCTION_DONE");

    const chit = Number(chitAmount);
    const auctionAmount = values.auctionAmount;
    const agentCommission = (chit * values.commissionPercent) / 100;
    const netAmount = chit - auctionAmount;
    const dividend = auctionAmount - agentCommission;
    const dividendPerMember = dividend / members.length || 0;
    const payablePerPerson = dividendPerMember
      ? chit / members.length - dividendPerMember
      : 0;

    setCalculation({
      commissionPercent: String(values.commissionPercent),
      auctionAmount: String(auctionAmount),
      agentCommission: String(agentCommission),
      netAmount: String(netAmount),
      dividend: String(dividend),
      dividendPerMember: String(dividendPerMember),
      payablePerPerson: String(payablePerPerson),
    });
  }

  async function onMarkCompleted() {
    setSubmitting(true);
    const result = await markAuctionCompleted(auction.id);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setStatus("COMPLETED");
    toast.success("Auction marked completed.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/dashboard/chits/${chitId}`} />}
        >
          <ArrowLeft className="size-4" /> Back to {chitName}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{auction.monthLabel}</h1>
        <Badge
          variant={
            status === "PENDING"
              ? "secondary"
              : status === "AUCTION_DONE"
                ? "default"
                : "outline"
          }
        >
          {status.replace("_", " ")}
        </Badge>
      </div>

      {members.length > 0 && (
        <FadeIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Collected"
              value={formatCurrency(totalCollected)}
              icon={IndianRupee}
              accent="success"
            />
            <StatCard
              label="Expected Total"
              value={calculation ? formatCurrency(expectedTotal) : "-"}
              icon={Wallet}
            />
            <StatCard
              label="Members Paid"
              value={`${paidCount}/${members.length}`}
              icon={Users}
              accent={paidCount === members.length ? "success" : "warning"}
            />
            <Card>
              <CardContent className="flex flex-col justify-center gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Percent className="size-3.5" /> Collection Progress
                  </span>
                  <span className="font-semibold">{collectionProgress}%</span>
                </div>
                <Progress value={collectionProgress} />
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-4 text-red-600" />
                Record Auction Result
              </CardTitle>
              <CardDescription>
                Chit amount: {formatCurrency(chitAmount)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={form.control}
                    name="auctionAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Winning bid / auction amount</FormLabel>
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
                    name="commissionPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent commission (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {submitting
                      ? "Saving..."
                      : calculation
                        ? "Update Result"
                        : "Calculate & Save"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {calculation && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-4 text-amber-500" />
                  Auction Winner
                </CardTitle>
                <CardDescription>
                  Mark who won this month&apos;s auction. Members who already
                  won a previous month are excluded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {winnerId ? (
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
                    <span className="flex items-center gap-2 font-medium">
                      <Crown className="size-4 text-amber-500" />
                      {winnerName}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={winnerSubmitting}
                      onClick={onClearWinner}
                      title="Clear winner"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : eligibleMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All members have already won a previous month.
                  </p>
                ) : (
                  <Select<string>
                    disabled={winnerSubmitting}
                    onValueChange={(value) => {
                      if (value) onSelectWinner(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select this month's winner" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleMembers.map((m) => (
                        <SelectItem key={m.chitMemberId} value={m.chitMemberId}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-red-600" />
                Member Payments
              </CardTitle>
              <CardDescription>
                Enter the amount collected from each member this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No members assigned to this chit yet.
                </p>
              ) : (
                <div className="flex flex-col">
                  {members.map((member) => (
                    <MemberPaymentRowItem
                      key={member.chitMemberId}
                      auctionId={auction.id}
                      member={{
                        ...member,
                        prized: prizedMap.get(member.chitMemberId) ?? member.prized,
                      }}
                      suggestedAmount={
                        calculation ? calculation.payablePerPerson : null
                      }
                      onPaidChange={(paid, amount) =>
                        setPaymentState((prev) => {
                          const next = new Map(prev);
                          next.set(member.chitMemberId, { paid, amount });
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle>Calculation Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {calculation ? (
                <div className="flex flex-col">
                  <ResultRow label="Auction amount" value={calculation.auctionAmount} />
                  <ResultRow
                    label="Agent commission"
                    value={calculation.agentCommission}
                  />
                  <ResultRow label="Net amount" value={calculation.netAmount} />
                  <ResultRow label="Dividend" value={calculation.dividend} />
                  <ResultRow
                    label="Dividend per member"
                    value={calculation.dividendPerMember}
                  />

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 dark:bg-red-950/30">
                    <span className="font-semibold">Payable per person</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(calculation.payablePerPerson)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Share result
                    </p>
                    <ShareCalculation
                      message={buildAuctionShareMessage({
                        chitName,
                        monthLabel: auction.monthLabel,
                        auctionAmount: calculation.auctionAmount,
                        agentCommission: calculation.agentCommission,
                        netAmount: calculation.netAmount,
                        dividend: calculation.dividend,
                        dividendPerMember: calculation.dividendPerMember,
                        payablePerPerson: calculation.payablePerPerson,
                      })}
                    />
                  </div>

                  {status === "AUCTION_DONE" && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      disabled={submitting}
                      onClick={onMarkCompleted}
                    >
                      <CheckCircle2 className="size-4" /> Mark Month Completed
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Record the auction result to see the calculation.
                </p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
