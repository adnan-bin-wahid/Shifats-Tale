import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth-guards";
import { getDhakaToday, resolveFinancePeriod } from "@/lib/finance/finance-domain";
import { createAdminClient } from "@/lib/supabase/admin";

function csv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
  });

  try {
    await requireTeacher();
    const search = request.nextUrl.searchParams;
    const period = resolveFinancePeriod(
      search.get("period") || undefined,
      search.get("from") || undefined,
      search.get("to") || undefined,
      getDhakaToday()
    );
    const admin = createAdminClient();
    let incomeQuery = admin
      .from("finance_income_ledger")
      .select("*")
      .order("transaction_date", { ascending: false });
    let expenseQuery = admin
      .from("finance_expenses")
      .select("*, category:finance_expense_categories(name)")
      .order("expense_date", { ascending: false });
    if (period.from && period.to) {
      incomeQuery = incomeQuery
        .gte("transaction_date", period.from)
        .lte("transaction_date", period.to);
      expenseQuery = expenseQuery
        .gte("expense_date", period.from)
        .lte("expense_date", period.to);
    }

    const [incomeResult, expenseResult] = await Promise.all([incomeQuery, expenseQuery]);
    if (incomeResult.error || expenseResult.error) {
      throw new Error(incomeResult.error?.message || expenseResult.error?.message);
    }

    const rows = [
      ...(incomeResult.data || []).map((item) => ({
        date: item.transaction_date,
        type: "INCOME",
        title: `${item.student_name} - ${item.batch_name}`,
        category: "Student fee collection",
        method: item.payment_method || "",
        reference: item.reference_number || "",
        amount: Number(item.amount),
        status: item.status,
        notes: `Billing period ${item.billing_month}/${item.billing_year}; Student ${item.student_code}`,
      })),
      ...(expenseResult.data || []).map((item) => {
        const category = item.category as { name?: string } | null;
        return {
          date: item.expense_date,
          type: "EXPENSE",
          title: item.title,
          category: category?.name || "Other",
          method: item.payment_method,
          reference: item.reference_number || "",
          amount: Number(item.amount),
          status: item.status,
          notes: [item.payee ? `Payee: ${item.payee}` : "", item.description || "", item.void_reason || ""]
            .filter(Boolean)
            .join(" | "),
        };
      }),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const body = [
      [
        "Date",
        "Type",
        "Title",
        "Category",
        "Payment Method",
        "Reference",
        "Amount (BDT)",
        "Status",
        "Notes",
      ]
        .map(csv)
        .join(","),
      ...rows.map((row) =>
        [
          row.date,
          row.type,
          row.title,
          row.category,
          row.method,
          row.reference,
          row.amount.toFixed(2),
          row.status,
          row.notes,
        ]
          .map(csv)
          .join(",")
      ),
    ].join("\r\n");

    const suffix =
      period.from && period.to ? `${period.from}_to_${period.to}` : "all-time";
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set(
      "Content-Disposition",
      `attachment; filename="finance-ledger-${suffix}.csv"`
    );
    return new NextResponse(`\uFEFF${body}`, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Finance export is unavailable." }, { status: 403, headers });
  }
}
