import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Download,
  FileText,
  Landmark,
  Minus,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateFinanceSummary,
  formatFinanceCurrency,
  getDhakaToday,
  percentageChange,
  resolveFinancePeriod,
} from "@/lib/finance/finance-domain";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  ExpenseEditor,
  ExpenseStatusAction,
  PrintFinanceButton,
  type FinanceCategoryOption,
  type FinanceExpenseForEdit,
} from "@/components/finance/expense-controls";
import {
  FinanceCharts,
  type FinanceCategoryChartPoint,
  type FinanceMonthlyChartPoint,
} from "@/components/finance/finance-charts";
import { FINANCE_PAYMENT_METHODS } from "@/lib/validations/finance";

type FinanceSearchParams = {
  period?: string;
  from?: string;
  to?: string;
  type?: string;
  category?: string;
  method?: string;
  q?: string;
};

type IncomeRow = {
  payment_id: string;
  transaction_date: string;
  amount: number;
  status: "PAID" | "PARTIALLY_PAID";
  payment_method: string | null;
  reference_number: string | null;
  billing_month: number;
  billing_year: number;
  student_id: string;
  batch_id: string;
  student_code: string;
  student_name: string;
  batch_name: string;
  batch_code: string;
};

type ExpenseRow = FinanceExpenseForEdit & {
  category: {
    id: string;
    name: string;
    color_hex: string;
  } | null;
  void_reason: string | null;
  created_at: string;
};

type CategoryRow = FinanceCategoryOption & {
  code: string;
  display_order: number;
  is_active: boolean;
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  BKASH: "bKash",
  NAGAD: "Nagad",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

function percentLabel(value: number | null) {
  if (value === null) return "New activity";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function ChangeIndicator({
  value,
  inverse = false,
}: {
  value: number | null;
  inverse?: boolean;
}) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500">
        <Minus className="h-3 w-3" /> No change
      </span>
    );
  }
  const positive = value === null || value > 0;
  const good = inverse ? !positive : positive;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-black ${
        good ? "text-emerald-700" : "text-rose-700"
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {percentLabel(value)} vs previous
    </span>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  change,
  icon: Icon,
  tone,
  inverseChange = false,
}: {
  label: string;
  value: string;
  hint: string;
  change: number | null;
  icon: typeof Banknote;
  tone: "emerald" | "orange" | "navy" | "blue";
  inverseChange?: boolean;
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    navy: "bg-primary/5 text-primary border-primary/10",
    blue: "bg-sky-50 text-sky-700 border-sky-100",
  };
  return (
    <article className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</p>
        </div>
        <span className={`rounded-2xl border p-3 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-[10px] font-bold text-slate-500">{hint}</p>
      <div className="mt-2">
        <ChangeIndicator value={change} inverse={inverseChange} />
      </div>
    </article>
  );
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function lastTwelveMonths(today: string) {
  const date = new Date(`${today}T00:00:00.000Z`);
  const result: Array<{ key: string; label: string }> = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
    result.push({
      key: value.toISOString().slice(0, 7),
      label: value.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    });
  }
  return result;
}

function asIncomeRows(value: unknown): IncomeRow[] {
  return Array.isArray(value) ? (value as IncomeRow[]) : [];
}

function asExpenseRows(value: unknown): ExpenseRow[] {
  return Array.isArray(value) ? (value as ExpenseRow[]) : [];
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

export default async function FinanceManagementPage({
  searchParams,
}: {
  searchParams: Promise<FinanceSearchParams>;
}) {
  await requireTeacher();
  const params = await searchParams;
  const today = getDhakaToday();
  const period = resolveFinancePeriod(params.period, params.from, params.to, today);
  const customDefaultFrom = params.from || period.from || today;
  const customDefaultTo =
    params.to || (period.to && period.to <= today ? period.to : today);
  const admin = createAdminClient();

  let currentIncomeQuery = admin
    .from("finance_income_ledger")
    .select("*")
    .order("transaction_date", { ascending: false });
  let currentExpenseQuery = admin
    .from("finance_expenses")
    .select("*, category:finance_expense_categories(id, name, color_hex)")
    .order("expense_date", { ascending: false });
  let previousIncomeQuery = admin.from("finance_income_ledger").select("*");
  let previousExpenseQuery = admin
    .from("finance_expenses")
    .select("*, category:finance_expense_categories(id, name, color_hex)")
    .eq("status", "POSTED");

  if (period.from && period.to) {
    currentIncomeQuery = currentIncomeQuery
      .gte("transaction_date", period.from)
      .lte("transaction_date", period.to);
    currentExpenseQuery = currentExpenseQuery
      .gte("expense_date", period.from)
      .lte("expense_date", period.to);
  }
  if (period.previousFrom && period.previousTo) {
    previousIncomeQuery = previousIncomeQuery
      .gte("transaction_date", period.previousFrom)
      .lte("transaction_date", period.previousTo);
    previousExpenseQuery = previousExpenseQuery
      .gte("expense_date", period.previousFrom)
      .lte("expense_date", period.previousTo);
  } else {
    previousIncomeQuery = previousIncomeQuery.limit(0);
    previousExpenseQuery = previousExpenseQuery.limit(0);
  }

  const twelveMonths = lastTwelveMonths(today);
  const trendFrom = `${twelveMonths[0].key}-01`;
  const [
    categoryResult,
    currentIncomeResult,
    currentExpenseResult,
    previousIncomeResult,
    previousExpenseResult,
    trendIncomeResult,
    trendExpenseResult,
  ] = await Promise.all([
    admin
      .from("finance_expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    currentIncomeQuery,
    currentExpenseQuery,
    previousIncomeQuery,
    previousExpenseQuery,
    admin
      .from("finance_income_ledger")
      .select("*")
      .gte("transaction_date", trendFrom)
      .lte("transaction_date", today),
    admin
      .from("finance_expenses")
      .select("*, category:finance_expense_categories(id, name, color_hex)")
      .eq("status", "POSTED")
      .gte("expense_date", trendFrom)
      .lte("expense_date", today),
  ]);

  const firstError = [
    categoryResult.error,
    currentIncomeResult.error,
    currentExpenseResult.error,
    previousIncomeResult.error,
    previousExpenseResult.error,
    trendIncomeResult.error,
    trendExpenseResult.error,
  ].find(Boolean);
  if (firstError) {
    throw new Error(`Finance data could not be loaded: ${firstError.message}`);
  }

  const categories = (categoryResult.data || []) as CategoryRow[];
  const currentIncome = asIncomeRows(currentIncomeResult.data);
  const currentExpenses = asExpenseRows(currentExpenseResult.data);
  const previousIncome = asIncomeRows(previousIncomeResult.data);
  const previousExpenses = asExpenseRows(previousExpenseResult.data);
  const trendIncome = asIncomeRows(trendIncomeResult.data);
  const trendExpenses = asExpenseRows(trendExpenseResult.data);

  const currentSummary = calculateFinanceSummary(
    currentIncome.map((item) => ({ paid_amount: item.amount, status: item.status })),
    currentExpenses
  );
  const previousSummary = calculateFinanceSummary(
    previousIncome.map((item) => ({ paid_amount: item.amount, status: item.status })),
    previousExpenses
  );
  const incomeChange = percentageChange(currentSummary.income, previousSummary.income);
  const expenseChange = percentageChange(currentSummary.expense, previousSummary.expense);
  const profitChange = percentageChange(currentSummary.netProfit, previousSummary.netProfit);
  const margin =
    currentSummary.income > 0 ? (currentSummary.netProfit / currentSummary.income) * 100 : 0;
  const previousMargin =
    previousSummary.income > 0
      ? (previousSummary.netProfit / previousSummary.income) * 100
      : 0;

  const monthlyMap = new Map(
    twelveMonths.map((month) => [
      month.key,
      { month: month.label, income: 0, expense: 0, profit: 0 },
    ])
  );
  trendIncome.forEach((item) => {
    const entry = monthlyMap.get(monthKey(item.transaction_date));
    if (entry) entry.income += Number(item.amount);
  });
  trendExpenses.forEach((item) => {
    const entry = monthlyMap.get(monthKey(item.expense_date));
    if (entry && item.status === "POSTED") entry.expense += Number(item.amount);
  });
  const monthlyData: FinanceMonthlyChartPoint[] = Array.from(monthlyMap.values()).map(
    (entry) => ({ ...entry, profit: entry.income - entry.expense })
  );

  const categoryTotals = new Map<string, number>();
  currentExpenses
    .filter((expense) => expense.status === "POSTED")
    .forEach((expense) => {
      categoryTotals.set(
        expense.category_id,
        (categoryTotals.get(expense.category_id) || 0) + Number(expense.amount)
      );
    });
  const previousCategoryTotals = new Map<string, number>();
  previousExpenses
    .filter((expense) => expense.status === "POSTED")
    .forEach((expense) => {
      previousCategoryTotals.set(
        expense.category_id,
        (previousCategoryTotals.get(expense.category_id) || 0) + Number(expense.amount)
      );
    });
  const categoryData: FinanceCategoryChartPoint[] = categories
    .map((category) => ({
      name: category.name,
      value: categoryTotals.get(category.id) || 0,
      color: category.color_hex,
    }))
    .sort((a, b) => b.value - a.value);
  const largestCategory = categoryData.find((item) => item.value > 0);

  const q = normalize(params.q);
  const typeFilter = params.type || "ALL";
  const categoryFilter = params.category || "ALL";
  const methodFilter = params.method || "ALL";
  const unifiedEntries = [
    ...currentIncome.map((item) => ({
      id: item.payment_id,
      date: item.transaction_date,
      type: "INCOME" as const,
      title: `${item.student_name} · ${item.batch_code}`,
      detail: `Fee collection for ${item.billing_month}/${item.billing_year}`,
      category: "Student fee collection",
      method: item.payment_method || "—",
      reference: item.reference_number,
      amount: Number(item.amount),
      href: `/teacher/payments/${item.payment_id}`,
      voided: false,
    })),
    ...currentExpenses.map((item) => ({
      id: item.id,
      date: item.expense_date,
      type: "EXPENSE" as const,
      title: item.title,
      detail: item.payee ? `Paid to ${item.payee}` : item.description || "Operating expense",
      category: item.category?.name || "Other",
      categoryId: item.category_id,
      method: item.payment_method,
      reference: item.reference_number,
      amount: Number(item.amount),
      href: null,
      voided: item.status === "VOID",
    })),
  ]
    .filter((entry) => typeFilter === "ALL" || entry.type === typeFilter)
    .filter(
      (entry) =>
        categoryFilter === "ALL" ||
        (entry.type === "EXPENSE" && entry.categoryId === categoryFilter)
    )
    .filter(
      (entry) =>
        methodFilter === "ALL" ||
        entry.method.toUpperCase().replaceAll(" ", "_") === methodFilter
    )
    .filter(
      (entry) =>
        !q ||
        [entry.title, entry.detail, entry.category, entry.reference || "", entry.method]
          .join(" ")
          .toLowerCase()
          .includes(q)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 100);

  const exportParams = new URLSearchParams();
  if (params.period) exportParams.set("period", params.period);
  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  const exportHref = `/api/finance/export?${exportParams.toString()}`;

  return (
    <div className="space-y-6 pb-10 print:bg-white">
      <DashboardPageHeader
        title="Finance Management"
        description="Actual fee collections and operating expenses in one synchronized, auditable ledger."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
            <PrintFinanceButton />
            <a
              href={exportHref}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
            <ExpenseEditor categories={categories} today={today} />
          </div>
        }
      />

      <section className="rounded-3xl border border-primary/10 bg-gradient-to-br from-[#071A45] via-primary to-[#132B6B] p-5 text-white shadow-xl shadow-primary/10 sm:p-6 print:hidden">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <Landmark className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Accounting period
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">{period.label}</h2>
            <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-blue-100">
              Income is read automatically from confirmed student collections. Expected fees and
              unpaid dues are never counted as income.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["this_month", "This month"],
              ["last_month", "Last month"],
              ["this_year", "This year"],
              ["all_time", "All time"],
            ].map(([key, label]) => (
              <Link
                key={key}
                href={`/teacher/finance?period=${key}`}
                className={`rounded-xl border px-3 py-2 text-[10px] font-black transition ${
                  period.key === key
                    ? "border-amber-300 bg-amber-300 text-primary"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <form action="/teacher/finance" className="mt-5 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="period" value="custom" />
          <label className="text-[10px] font-black uppercase tracking-wider text-blue-100">
            From
            <input
              type="date"
              name="from"
              required
              max={today}
              defaultValue={customDefaultFrom}
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-bold text-white outline-none [color-scheme:dark]"
            />
          </label>
          <label className="text-[10px] font-black uppercase tracking-wider text-blue-100">
            To
            <input
              type="date"
              name="to"
              required
              max={today}
              defaultValue={customDefaultTo}
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-bold text-white outline-none [color-scheme:dark]"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-white px-5 py-2.5 text-xs font-black text-primary"
          >
            Apply custom range
          </button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Collected fees"
          value={formatFinanceCurrency(currentSummary.income)}
          hint={`${currentSummary.collectionCount} confirmed collection record(s) · expected excluded`}
          change={incomeChange}
          icon={WalletCards}
          tone="emerald"
        />
        <SummaryCard
          label="Total expenses"
          value={formatFinanceCurrency(currentSummary.expense)}
          hint={`${currentSummary.expenseCount} posted expense(s) · voided excluded`}
          change={expenseChange}
          inverseChange
          icon={ReceiptText}
          tone="orange"
        />
        <SummaryCard
          label="Net profit"
          value={formatFinanceCurrency(currentSummary.netProfit)}
          hint="Collected fees − posted expenses"
          change={profitChange}
          icon={currentSummary.netProfit >= 0 ? TrendingUp : TrendingDown}
          tone="navy"
        />
        <SummaryCard
          label="Profit margin"
          value={`${margin.toFixed(1)}%`}
          hint={
            largestCategory
              ? `Highest cost: ${largestCategory.name}`
              : "No expense category recorded"
          }
          change={margin - previousMargin}
          icon={Scale}
          tone="blue"
        />
      </section>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs font-semibold text-emerald-900 print:hidden">
        <span className="font-black">Income is automatic.</span> Record or correct student fees in{" "}
        <Link href="/teacher/payments" className="font-black underline underline-offset-2">
          Payment Ledger
        </Link>
        ; this dashboard updates from the same payment data, so no duplicate income entry is needed.
      </div>

      <FinanceCharts monthlyData={monthlyData} categoryData={categoryData} />

      <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Unified ledger
            </p>
            <h2 className="mt-1 text-lg font-black text-primary">Collections & expenses</h2>
            <p className="mt-1 text-xs font-semibold text-muted">
              Up to 100 matching entries for the selected accounting period.
            </p>
          </div>
          <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
            <input type="hidden" name="period" value={period.key} />
            {period.key === "custom" && (
              <>
                <input type="hidden" name="from" value={period.from || ""} />
                <input type="hidden" name="to" value={period.to || ""} />
              </>
            )}
            <select
              name="type"
              defaultValue={typeFilter}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold"
            >
              <option value="ALL">All entries</option>
              <option value="INCOME">Income only</option>
              <option value="EXPENSE">Expense only</option>
            </select>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold"
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              name="method"
              defaultValue={methodFilter}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold"
            >
              <option value="ALL">All methods</option>
              {FINANCE_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabels[method]}
                </option>
              ))}
            </select>
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search ledger…"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-[11px] font-black text-white"
            >
              Filter
            </button>
          </form>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-wider text-muted">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Details</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Method / reference</th>
                <th className="px-3 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {unifiedEntries.map((entry) => (
                <tr
                  key={`${entry.type}-${entry.id}`}
                  className={`border-b border-slate-50 text-xs ${entry.voided ? "opacity-50" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-3.5 font-bold text-slate-600">
                    {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-BD", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${
                        entry.type === "INCOME"
                          ? "bg-emerald-50 text-emerald-700"
                          : entry.voided
                            ? "bg-slate-100 text-slate-600"
                            : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {entry.voided ? "VOID EXPENSE" : entry.type}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    {entry.href ? (
                      <Link href={entry.href} className="font-black text-primary hover:underline">
                        {entry.title}
                      </Link>
                    ) : (
                      <p className={`font-black text-slate-800 ${entry.voided ? "line-through" : ""}`}>
                        {entry.title}
                      </p>
                    )}
                    <p className="mt-0.5 max-w-xs truncate text-[10px] font-semibold text-muted">
                      {entry.detail}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 font-bold text-slate-600">{entry.category}</td>
                  <td className="px-3 py-3.5">
                    <p className="font-bold text-slate-700">
                      {paymentMethodLabels[entry.method] || entry.method}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-muted">
                      {entry.reference || "No reference"}
                    </p>
                  </td>
                  <td
                    className={`px-3 py-3.5 text-right font-black ${
                      entry.voided
                        ? "text-slate-400 line-through"
                        : entry.type === "INCOME"
                          ? "text-emerald-700"
                          : "text-orange-700"
                    }`}
                  >
                    {entry.type === "INCOME" ? "+" : "−"}
                    {formatFinanceCurrency(entry.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {unifiedEntries.length === 0 && (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl bg-slate-50 text-center">
              <FileText className="h-7 w-7 text-slate-300" />
              <p className="mt-2 text-xs font-black text-slate-700">No ledger entry found</p>
              <p className="mt-1 text-[10px] font-semibold text-muted">
                Change the period or filters, or record the first expense.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                Expense records
              </p>
              <h2 className="mt-1 text-lg font-black text-primary">Audit-safe expense log</h2>
            </div>
            <ExpenseEditor categories={categories} today={today} />
          </div>
          <div className="mt-5 space-y-3">
            {currentExpenses.slice(0, 20).map((expense) => (
              <article
                key={expense.id}
                className={`rounded-2xl border p-4 ${
                  expense.status === "VOID"
                    ? "border-slate-200 bg-slate-50 opacity-70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: expense.category?.color_hex || "#64748B" }}
                      />
                      <p
                        className={`truncate text-sm font-black text-slate-900 ${
                          expense.status === "VOID" ? "line-through" : ""
                        }`}
                      >
                        {expense.title}
                      </p>
                      {expense.status === "VOID" && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[8px] font-black text-slate-700">
                          VOID
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-muted">
                      {expense.category?.name || "Other"} · {expense.expense_date} ·{" "}
                      {paymentMethodLabels[expense.payment_method]}
                      {expense.payee ? ` · ${expense.payee}` : ""}
                    </p>
                    {expense.void_reason && (
                      <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700">
                        Void reason: {expense.void_reason}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-base font-black text-orange-700">
                    {formatFinanceCurrency(Number(expense.amount))}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    {expense.receipt_storage_path && (
                      <a
                        href={`/api/finance/expenses/${expense.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[10px] font-black text-sky-700"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Receipt
                      </a>
                    )}
                    {expense.reference_number && (
                      <span className="text-[9px] font-bold text-muted">
                        Ref: {expense.reference_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <ExpenseEditor categories={categories} today={today} expense={expense} />
                    <ExpenseStatusAction expense={expense} />
                  </div>
                </div>
              </article>
            ))}
            {currentExpenses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                <ReceiptText className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-black text-slate-700">No expense recorded</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            Cost comparison
          </p>
          <h2 className="mt-1 text-lg font-black text-primary">Where money is going</h2>
          <div className="mt-5 space-y-3">
            {categoryData.map((item) => {
              const category = categories.find((value) => value.name === item.name);
              const previousValue = category
                ? previousCategoryTotals.get(category.id) || 0
                : 0;
              const change = percentageChange(item.value, previousValue);
              const share =
                currentSummary.expense > 0 ? (item.value / currentSummary.expense) * 100 : 0;
              return (
                <div key={item.name} className="rounded-2xl border border-slate-100 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-800">{item.name}</p>
                      <p className="mt-1 text-[9px] font-bold text-muted">
                        {share.toFixed(1)}% of selected-period expense
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">
                        {formatFinanceCurrency(item.value)}
                      </p>
                      {item.value > 0 && (
                        <p
                          className={`mt-1 text-[9px] font-black ${
                            change !== null && change > 0
                              ? "text-rose-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {percentLabel(change)} vs previous
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(share, 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
