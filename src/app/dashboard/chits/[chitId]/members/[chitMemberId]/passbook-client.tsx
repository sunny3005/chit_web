"use client";

import Link from "next/link";
import { ArrowLeft, Crown, FileSpreadsheet, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/shared/fade-in";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/format";

export type PassbookRow = {
  monthIndex: number;
  monthLabel: string;
  status: "PENDING" | "AUCTION_DONE" | "COMPLETED";
  payablePerPerson: string | null;
  amountPaid: string | null;
  paid: boolean;
};

const STATUS_VARIANT: Record<
  PassbookRow["status"],
  "secondary" | "default" | "outline"
> = {
  PENDING: "secondary",
  AUCTION_DONE: "default",
  COMPLETED: "outline",
};

export function PassbookClient({
  chitId,
  chitMemberId,
  chitName,
  memberName,
  memberPhone,
  prized,
  prizedMonth,
  rows,
}: {
  chitId: string;
  chitMemberId: string;
  chitName: string;
  memberName: string;
  memberPhone: string;
  prized: boolean;
  prizedMonth: number | null;
  rows: PassbookRow[];
}) {
  const totalPaid = rows.reduce(
    (sum, r) => sum + (r.paid && r.amountPaid ? Number(r.amountPaid) : 0),
    0
  );
  const totalExpected = rows.reduce(
    (sum, r) => sum + (r.payablePerPerson ? Number(r.payablePerPerson) : 0),
    0
  );
  const monthsPaid = rows.filter((r) => r.paid).length;

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{memberName}</h1>
            {prized && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
              >
                <Crown className="size-3" />
                Prized{prizedMonth ? ` (Month ${prizedMonth})` : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {memberPhone} · {chitName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={`/api/exports/passbook/${chitMemberId}?format=excel`}
                download
              />
            }
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/exports/passbook/${chitMemberId}?format=pdf`} download />
            }
          >
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      <FadeIn>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-emerald-600">
              {formatCurrency(totalPaid)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Total Expected
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold">
              {formatCurrency(totalExpected)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Months Paid
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold">
              {monthsPaid}/{rows.length}
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      <Card>
        <CardHeader>
          <CardTitle>Contribution History</CardTitle>
          <CardDescription>
            Every month&apos;s payable amount and what was actually paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No months yet"
              description="This chit has no scheduled months."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payable</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Settled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.monthIndex}>
                    <TableCell className="font-medium">{row.monthLabel}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>
                        {row.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.payablePerPerson ? formatCurrency(row.payablePerPerson) : "-"}
                    </TableCell>
                    <TableCell>
                      {row.amountPaid ? formatCurrency(row.amountPaid) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.paid ? (
                        <Badge className="bg-emerald-600/10 text-emerald-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
