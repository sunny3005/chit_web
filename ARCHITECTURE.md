# Chits Management System — Architecture

Status: APPROVED — implementation in progress.

## 1. Tech Stack (confirmed)

- Next.js 15 (App Router, Server Actions)
- TypeScript (strict)
- TailwindCSS + shadcn/ui
- Supabase (Auth + Postgres)
- Prisma ORM (schema/migrations against the Supabase Postgres DB)
- React Hook Form + Zod
- Lucide Icons, React Hot Toast, Framer Motion
- Exports: @react-pdf/renderer (PDF), exceljs (Excel)

Auth: Supabase Auth built-in (email OTP for signup verification + password reset, session via Supabase SSR cookies).

Interest % on the calculation screen is informational only — stored per month, not part of the agentCommission/netAmount/dividend formulas.

---

## 2. Folder Structure

```
chit_web/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── verify-otp/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # sidebar + topbar shell, protected
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── chits/
│   │   │   │   ├── page.tsx            # Setup Chits — list + create
│   │   │   │   └── [chitId]/
│   │   │   │       ├── page.tsx        # Manage Chit — step wizard / months
│   │   │   │       └── months/[month]/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # root layout, theme provider, toaster
│   │   └── globals.css
│   ├── components/
│   │   ui/            # shadcn primitives (button, input, dialog, etc.)
│   │   layout/         # Sidebar, Topbar, PageHeader
│   │   shared/         # EmptyState, LoadingSkeleton, ConfirmDialog, DataTable, Pagination, SearchInput, StatCard
│   ├── features/
│   │   ├── auth/           components (LoginForm, SignupForm, OtpInput, PasswordForm)
│   │   ├── dashboard/      components (StatsGrid, RecentActivity, QuickActions)
│   │   ├── chits/          components (ChitCard, ChitForm, ChitList)
│   │   ├── members/        components (MemberForm, MembersTable)
│   │   ├── manage-chit/    components (MonthAccordion, AssignMembersDialog, CalculationForm, CalculationSummaryCard, WhatsAppCopyButton, MonthRangeStep)
│   │   └── reports/        components (ReportFilters, ExportButtons)
│   ├── actions/         # Server Actions, one file per feature (auth.ts, chits.ts, members.ts, manage-chit.ts, reports.ts, profile.ts)
│   ├── services/        # DB access layer (chitService, memberService, calculationService) — actions call services, never Prisma directly in actions
│   ├── schemas/         # Zod schemas (auth.schema.ts, chit.schema.ts, member.schema.ts, calculation.schema.ts)
│   ├── types/            # shared TS types/interfaces
│   ├── lib/               # prisma.ts, supabase/client.ts, supabase/server.ts, utils.ts (cn, formatCurrency, formatDate)
│   └── hooks/            # useDebounce, usePagination, useConfirm
├── middleware.ts          # protects (dashboard) routes via Supabase session
├── .env.local.example
└── package.json
```

Rule: **actions/** = thin server action wrappers (auth check → validate → call service → revalidatePath). **services/** = all Prisma queries. No Prisma imports outside `services/`. No duplicate query logic.

---

## 3. Database Schema (Prisma, normalized)

```prisma
model Profile {
  id          String   @id @db.Uuid          // = supabase auth.users.id
  fullName    String
  email       String   @unique
  phone       String   @unique
  avatarUrl   String?
  theme       Theme    @default(SYSTEM)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chits         Chit[]
  members       Member[]
  activityLogs  ActivityLog[]
}

enum Theme { LIGHT DARK SYSTEM }

model Member {
  id         String   @id @default(uuid())
  ownerId    String   @db.Uuid
  owner      Profile  @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name       String
  phone      String
  email      String?
  address    String?
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  chitMembers ChitMember[]

  @@unique([ownerId, phone])      // no duplicate phone per owner
  @@unique([ownerId, name])       // no duplicate member name per owner
  @@index([ownerId])
}

enum ChitStatus { ACTIVE INACTIVE }

model Chit {
  id                String     @id @default(uuid())
  ownerId           String     @db.Uuid
  owner             Profile    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name              String
  totalAmount        Decimal    @db.Decimal(12, 2)
  numberOfMonths     Int
  numberOfMembers    Int
  description        String?
  status              ChitStatus @default(ACTIVE)

  startMonth          Int?       // 1-12, set in Manage Chit Step 1
  startYear            Int?
  endMonth             Int?
  endYear              Int?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  chitMembers          ChitMember[]
  monthlyAuctions      MonthlyAuction[]

  @@index([ownerId])
}

model ChitMember {
  id        String   @id @default(uuid())
  chitId    String
  chit      Chit     @relation(fields: [chitId], references: [id], onDelete: Cascade)
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  joinedAt  DateTime @default(now())

  @@unique([chitId, memberId])   // no duplicate assignment
  @@index([chitId])
}

enum MonthStatus { PENDING AUCTION_DONE COMPLETED }

model MonthlyAuction {
  id            String       @id @default(uuid())
  chitId        String
  chit          Chit         @relation(fields: [chitId], references: [id], onDelete: Cascade)
  monthIndex    Int          // 1..numberOfMonths
  monthLabel    String       // e.g. "July 2026"
  status        MonthStatus  @default(PENDING)

  calculation   MonthlyCalculation?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([chitId, monthIndex])
  @@index([chitId])
}

model MonthlyCalculation {
  id                     String         @id @default(uuid())
  monthlyAuctionId       String         @unique
  monthlyAuction         MonthlyAuction @relation(fields: [monthlyAuctionId], references: [id], onDelete: Cascade)

  interestPercent         Decimal @db.Decimal(5, 2)
  chitAmount               Decimal @db.Decimal(12, 2)   // snapshot, readonly
  totalMonths               Int                            // snapshot, readonly
  commissionPercent         Decimal @db.Decimal(5, 2)
  totalMembers               Int                            // snapshot, readonly
  auctionAmount               Decimal @db.Decimal(12, 2)

  agentCommission              Decimal @db.Decimal(12, 2)
  netAmount                     Decimal @db.Decimal(12, 2)
  dividend                       Decimal @db.Decimal(12, 2)
  dividendPerMember               Decimal @db.Decimal(12, 2)
  payablePerPerson                 Decimal @db.Decimal(12, 2)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

enum ActivityAction { CREATE UPDATE DELETE CALCULATE }

model ActivityLog {
  id         String         @id @default(uuid())
  ownerId    String         @db.Uuid
  owner      Profile        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  action     ActivityAction
  entity     String          // "Chit" | "Member" | "MonthlyAuction" ...
  entityId   String
  message    String          // human readable, e.g. "Created chit 'ABC Chit'"
  createdAt  DateTime @default(now())

  @@index([ownerId, createdAt])
}
```

Notes:
- `users`/`auth` table itself is owned by Supabase Auth (`auth.users`) — `Profile.id` is a foreign key to it (1:1), not a separate `users` table, avoiding duplication.
- Uniqueness constraints directly enforce "no duplicate member name/phone per owner" and "no duplicate chit assignment" at the DB level, backed by Zod validation at the form level for good UX.
- `Chit.numberOfMembers` is the cap enforced in the Assign Members dialog (service-layer check in a transaction).

---

## 4. User Flow Diagram (text form)

```
Landing Page
 ├─ Login ──────────────► Dashboard (session)
 │    └─ Forgot Password → Enter Email → OTP → New Password → Login
 └─ Signup
      Full Name/Email/Phone → Continue → Email OTP sent
      → Verify OTP → Setup Password → Account Created → Dashboard

Dashboard (protected, sidebar shell)
 ├─ Setup Chits → Create/Edit/Delete chit cards → [Manage] → Manage Chit flow
 ├─ Members → Add/Edit/Delete/Search/Paginate
 ├─ Manage Chits → pick chit →
 │     Step 1: Start Month / End Month → Save
 │     Step 2: Confirm number of months (derived, editable) → Save
 │     Step 3: Assign Members dialog (checkbox, capped at numberOfMembers) → Save
 │     Step 4: Auto-generated Month accordions (Month 1..N)
 │        → open month → Members List + Calculation form
 │        → Calculate → Summary card → Copy WhatsApp text → Mark month status
 ├─ Reports → totals, export PDF/Excel
 ├─ Profile → edit name/phone/email/password
 └─ Settings → theme
```

---

## 5. Component Tree (high level)

```
RootLayout
 ├─ ThemeProvider
 ├─ Toaster
 └─ {page}

(auth)/* pages
 └─ AuthCard
     ├─ LoginForm | SignupForm | OtpInput | SetPasswordForm | ForgotPasswordForm

(dashboard)/layout.tsx
 ├─ Sidebar (nav items, active state, logout)
 ├─ Topbar (greeting, user menu)
 └─ children
     ├─ DashboardPage → StatsGrid(StatCard×4) + RecentActivity + QuickActions
     ├─ ChitsPage → ChitForm(Dialog) + ChitList(ChitCard[])
     ├─ MembersPage → MemberForm(Dialog) + DataTable(MembersTable) + SearchInput + Pagination
     ├─ ManageChitPage([chitId])
     │    ├─ ChitHeader
     │    ├─ StepIndicator (1-4)
     │    ├─ MonthRangeStep (Step 1+2)
     │    ├─ AssignMembersDialog (Step 3)
     │    └─ MonthAccordion[] (Step 4)
     │         └─ MonthPanel
     │              ├─ MembersList (readonly, assigned members)
     │              ├─ CalculationForm (interest%, commission%, auctionAmount inputs; chitAmount/months/members readonly)
     │              └─ CalculationSummaryCard (after Calculate) + WhatsAppCopyButton
     ├─ ReportsPage → ReportFilters + StatCards + ExportButtons (PDF/Excel)
     ├─ ProfilePage → ProfileForm + PasswordChangeForm
     └─ SettingsPage → ThemeToggle
```

Shared/reused everywhere: `EmptyState`, `LoadingSkeleton`, `ConfirmDialog` (used for all deletes), `DataTable`, `Pagination`, `SearchInput`, `StatCard`, `PageHeader`.

---

## 6. Server Actions / "API" Structure

All mutations go through Server Actions (no separate REST API layer needed with App Router). Grouped by feature file in `src/actions/`:

- `auth.ts`: `signUp`, `verifyOtp`, `setPassword`, `signIn`, `forgotPassword`, `resetPassword`, `signOut`
- `chits.ts`: `createChit`, `updateChit`, `deleteChit`, `listChits`
- `members.ts`: `createMember`, `updateMember`, `deleteMember`, `listMembers` (search+paginate params)
- `manage-chit.ts`: `setChitMonthRange`, `assignMembers`, `generateMonths` (auto-called after step 3), `calculateMonth`, `updateMonthStatus`
- `reports.ts`: `getReportSummary`, `exportPdf`, `exportExcel`
- `profile.ts`: `updateProfile`, `changePassword`

Every action: `"use server"` → get authenticated user from Supabase session → Zod `safeParse` input → call `services/*` → `revalidatePath` → return `{ success, data? , error? }` discriminated union consumed by the client form (toast on error/success).

---

## 7. Calculation Logic (verified against example)

Given: `chitAmount`, `commissionPercent`, `totalMembers`, `auctionAmount` (user input), `interestPercent` (stored, informational only).

```
agentCommission   = chitAmount * commissionPercent / 100
netAmount         = chitAmount - auctionAmount
dividend          = auctionAmount - agentCommission
dividendPerMember = dividend / totalMembers
payablePerPerson  = (chitAmount / totalMembers) - dividendPerMember
```

Verified with chitAmount=50000, commission=4%, members=10, auction=3800:
agentCommission=2000, netAmount=46200, dividend=1800, dividendPerMember=180, payablePerPerson=4820 — exact match.

Validation: `auctionAmount >= 0`, `auctionAmount <= chitAmount`, `commissionPercent >= 0`, all enforced via Zod before calculation.

WhatsApp copy text template:
```
-------------------------
{CHIT NAME}
Month : {Month Name}
Auction Amount : ₹{auctionAmount}
Agent Commission : ₹{agentCommission}
Net Amount : ₹{netAmount}
Dividend : ₹{dividend}
Dividend Per Member : ₹{dividendPerMember}
Monthly Payable : ₹{payablePerPerson}
-------------------------
```

---

## 8. Implementation Plan (module by module, sequential)

1. **Bootstrap** — Next.js 15 + TS + Tailwind + shadcn init, folder skeleton, Prisma init, env template, base layout/theme/toaster. (IN PROGRESS)
2. **Auth module** — Landing page, Supabase SSR client/server helpers, middleware, Login/Signup/OTP/Forgot/Reset pages + Server Actions, session, remember-me, logout.
3. **Dashboard shell** — Sidebar + Topbar layout, protected group, empty-state Dashboard page.
4. **Members module** — schema, service, actions, MemberForm, MembersTable with search/pagination.
5. **Setup Chits module** — schema, service, actions, ChitForm, ChitCard grid.
6. **Manage Chits module (core)** — Steps 1-4, assign-members cap logic, month auto-generation.
7. **Calculation engine** — CalculationForm + summary card + WhatsApp copy, status transitions.
8. **Dashboard stats wiring** — connect StatsGrid + RecentActivity to real data.
9. **Reports module** — aggregation queries, PDF/Excel export.
10. **Profile & Settings modules.**
11. **Polish pass** — skeletons, empty states, animations, responsive QA, theming.
