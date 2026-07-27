# Finance Management Implementation Report

## Outcome

The coaching admin now has one integrated finance system at `/teacher/finance`.
The existing student `payments` table remains the authoritative income source,
so staff never enter the same fee collection twice. The finance module counts
only confirmed `PAID` and `PARTIALLY_PAID` `paid_amount` values. Expected fees,
unpaid dues, waived rows, cancelled rows, and refunded rows are not income.

## Delivered

- Actual collected-fee summary synchronized with Payment Ledger
- Actual operating-expense ledger with these seeded categories:
  - Rent & Utility
  - Sheets Making & Printing
  - Question Making & Printing
  - Exam Guard
  - Exam Script Evaluation
  - Markers, Duster & Stationery
  - Transportation
  - Events (Iftar, Farewell, etc.)
  - Other
- Expense create and edit controls
- Digital PDF/image receipt storage through the existing private R2 setup
- Secure teacher-only receipt viewing
- Payee/vendor, payment method, reference/transaction ID, description, and date
- Non-destructive void and restore workflow
- Unified income and expense ledger
- Current month, last month, current year, all-time, and custom date ranges
- Previous-period comparisons
- Twelve-month income, expense, and net-profit chart
- Expense category distribution and category-by-category comparison
- CSV export and printable report
- Server-side validation, teacher authorization, RLS, and audit logging

## Accounting Rules

1. Income is actual fee collection, not expected billing.
2. `Net profit = collected fees - posted expenses`.
3. A void expense stays in the audit trail but is excluded from totals.
4. A restored expense becomes part of totals again.
5. Payment corrections automatically revalidate the finance dashboard.
6. Expense records are not hard-deleted by the application.

## Database Change

Apply:

`supabase/migrations/20260727000000_finance_management.sql`

The migration adds:

- `finance_expense_status`
- `finance_payment_method`
- `finance_expense_categories`
- `finance_expenses`
- `finance_income_ledger`
- teacher-only RLS policies and indexes

## Apply and Run

From the project root:

```powershell
Copy-Item ".env.example" ".env.local"
# Fill .env.local with the existing project credentials.

npm install
npx supabase db push
npm run build
npm run dev
```

If Supabase CLI says that the project is not linked, link the existing Supabase
project first and then run `npx supabase db push`. Do not create a new Supabase
project for this module.

## Verification

- TypeScript strict typecheck
- Targeted ESLint
- Finance unit/integration source tests
- Full existing test suite
- Next.js production build
