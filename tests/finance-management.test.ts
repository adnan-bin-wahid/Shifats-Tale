import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculateFinanceSummary,
  percentageChange,
  resolveFinancePeriod,
} from "../src/lib/finance/finance-domain";

const read = (path: string) => readFileSync(path, "utf8");

test("Finance management", async (t) => {
  await t.test("counts collected fees only and never expected fees", () => {
    const result = calculateFinanceSummary(
      [
        { paid_amount: 1000, status: "PAID" },
        { paid_amount: 450, status: "PARTIALLY_PAID" },
        { paid_amount: 9999, status: "UNPAID" },
        { paid_amount: 800, status: "REFUNDED" },
        { paid_amount: 300, status: "CANCELLED" },
      ],
      [
        { amount: 500, status: "POSTED" },
        { amount: 700, status: "VOID" },
      ]
    );

    assert.deepEqual(result, {
      income: 1450,
      expense: 500,
      netProfit: 950,
      collectionCount: 2,
      expenseCount: 1,
    });
  });

  await t.test("resolves current, previous, annual, and custom periods deterministically", () => {
    assert.deepEqual(resolveFinancePeriod("this_month", undefined, undefined, "2026-07-27"), {
      key: "this_month",
      label: "July 2026",
      from: "2026-07-01",
      to: "2026-07-31",
      previousFrom: "2026-06-01",
      previousTo: "2026-06-30",
    });
    assert.deepEqual(resolveFinancePeriod("last_month", undefined, undefined, "2026-01-10"), {
      key: "last_month",
      label: "December 2025",
      from: "2025-12-01",
      to: "2025-12-31",
      previousFrom: "2025-11-01",
      previousTo: "2025-11-30",
    });
    assert.deepEqual(resolveFinancePeriod("custom", "2026-07-10", "2026-07-16", "2026-07-27"), {
      key: "custom",
      label: "2026-07-10 to 2026-07-16",
      from: "2026-07-10",
      to: "2026-07-16",
      previousFrom: "2026-07-03",
      previousTo: "2026-07-09",
    });
  });

  await t.test("handles percentage comparisons without division-by-zero fiction", () => {
    assert.equal(percentageChange(0, 0), 0);
    assert.equal(percentageChange(500, 0), null);
    assert.equal(percentageChange(125, 100), 25);
    assert.equal(percentageChange(75, 100), -25);
  });

  await t.test("ships teacher-only expense RLS and actual-income view", () => {
    const migration = read(
      "supabase/migrations/20260727000000_finance_management.sql"
    );

    assert.match(migration, /CREATE TABLE public\.finance_expenses/);
    assert.match(migration, /CREATE VIEW public\.finance_income_ledger/);
    assert.match(migration, /p\.status IN \('PAID', 'PARTIALLY_PAID'\)/);
    assert.match(migration, /p\.paid_amount > 0/);
    assert.doesNotMatch(
      migration.slice(
        migration.indexOf("CREATE VIEW public.finance_income_ledger"),
        migration.indexOf("ALTER TABLE public.finance_expense_categories")
      ),
      /expected_amount/
    );
    assert.match(migration, /USING \(public\.is_active_teacher\(\)\)/);
    assert.doesNotMatch(migration, /GRANT DELETE ON public\.finance_expenses/);
  });

  await t.test("protects every finance mutation and keeps payment revalidation synchronized", () => {
    const actions = read("src/app/actions/finance.ts");
    const payments = read("src/app/actions/payments.ts");

    assert.match(actions, /await requireTeacher\(\)/);
    assert.match(actions, /financeExpenseInputSchema\.safeParse/);
    assert.match(actions, /FINANCE_EXPENSE_CREATED/);
    assert.match(actions, /FINANCE_EXPENSE_UPDATED/);
    assert.match(actions, /FINANCE_EXPENSE_VOIDED/);
    assert.match(actions, /FINANCE_EXPENSE_RESTORED/);
    assert.doesNotMatch(actions, /\.from\("finance_expenses"\)\s*\.delete\(\)/);
    assert.match(payments, /revalidatePath\("\/teacher\/finance"\)/);
  });

  await t.test("exposes finance navigation, receipt access, export, and comparison UI", () => {
    const sidebar = read("src/components/dashboard/teacher-sidebar.tsx");
    const page = read("src/app/teacher/finance/page.tsx");
    const charts = read("src/components/finance/finance-charts.tsx");
    const receiptRoute = read(
      "src/app/api/finance/expenses/[expenseId]/receipt/route.ts"
    );
    const exportRoute = read("src/app/api/finance/export/route.ts");

    assert.match(sidebar, /Finance Management/);
    assert.match(page, /Expected fees and\s+unpaid dues are never counted as income/);
    assert.match(charts, /12-month comparison/);
    assert.match(page, /Where money is going/);
    assert.match(receiptRoute, /await requireTeacher\(\)/);
    assert.match(receiptRoute, /finance\/receipts\//);
    assert.match(exportRoute, /finance_income_ledger/);
    assert.match(exportRoute, /Content-Disposition/);
  });
});
