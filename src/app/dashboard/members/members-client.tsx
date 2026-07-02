"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Users, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FadeIn } from "@/components/shared/fade-in";
import { createMember, updateMember, deleteMember } from "@/lib/members/actions";

export type MemberRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
};

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(10, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

const PAGE_SIZE = 10;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberFormDialog({
  mode,
  member,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  member?: MemberRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member?.name ?? "",
      phone: member?.phone ?? "",
      email: member?.email ?? "",
      address: member?.address ?? "",
      notes: member?.notes ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result =
      mode === "create"
        ? await createMember(values)
        : await updateMember(member!.id, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Member added." : "Member updated.");
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Member" : "Edit Member"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new member to your contacts."
              : "Update this member's details."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+91 98765 43210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes..." {...field} />
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
                {submitting
                  ? "Saving..."
                  : mode === "create"
                    ? "Add Member"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMemberButton({ member }: { member: MemberRow }) {
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteMember(member.id);
    setDeleting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Member deleted.");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 className="text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this member and their chit
            memberships. This cannot be undone.
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

function EditMemberButton({ member }: { member: MemberRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
        <Pencil />
      </Button>
      <MemberFormDialog
        mode="edit"
        member={member}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

type SortKey = "name" | "phone";

export function MembersClient({ members }: { members: MemberRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.phone.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q)
        )
      : members;

    return [...result].sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
  }, [members, query, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function toggleSort(key: SortKey) {
    setSortKey(key);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description={`${members.length} member${members.length === 1 ? "" : "s"} in your contacts`}
        actions={
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" /> Add Member
          </Button>
        }
      />

      <MemberFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {members.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Add your first member to start assigning them to chits."
              action={
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" /> Add Member
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <FadeIn>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="relative max-w-sm">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  className="pl-8"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matches found"
                  description={`No members match "${query}".`}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            className="flex items-center gap-1 font-medium"
                            onClick={() => toggleSort("name")}
                          >
                            Name <ArrowUpDown className="size-3.5" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center gap-1 font-medium"
                            onClick={() => toggleSort("phone")}
                          >
                            Phone <ArrowUpDown className="size-3.5" />
                          </button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Email
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Address
                        </TableHead>
                        <TableHead className="w-24 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar size="sm">
                                <AvatarFallback className="bg-red-600/10 text-xs font-semibold text-red-600">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              {member.name}
                            </div>
                          </TableCell>
                          <TableCell>{member.phone}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {member.email ?? "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {member.address ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <EditMemberButton member={member} />
                              <DeleteMemberButton member={member} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
