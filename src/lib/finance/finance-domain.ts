export type FinancePeriodKey =
  | "this_month"
  | "last_month"
  | "this_year"
  | "all_time"
  | "custom";

export type FinancePeriod = {
  key: FinancePeriodKey;
  label: string;
  from: string | null;
  to: string | null;
  previousFrom: string | null;
  previousTo: string | null;
};

export type FinanceCollection = {
  paid_amount: number | string;
  status: string;
  transaction_date?: string | null;
  payment_date?: string | null;
};

export type FinanceExpense = {
  amount: number | string;
  status: string;
  expense_date?: string | null;
  category_id?: string | null;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateAtUtc(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function addDays(isoDate: string, days: number) {
  const date = dateAtUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
}

function monthStart(year: number, monthIndex: number) {
  return dateOnly(new Date(Date.UTC(year, monthIndex, 1)));
}

function monthEnd(year: number, monthIndex: number) {
  return dateOnly(new Date(Date.UTC(year, monthIndex + 1, 0)));
}

function monthLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function getDhakaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function resolveFinancePeriod(
  keyInput: string | undefined,
  customFrom: string | undefined,
  customTo: string | undefined,
  today = getDhakaToday()
): FinancePeriod {
  const allowed = new Set<FinancePeriodKey>([
    "this_month",
    "last_month",
    "this_year",
    "all_time",
    "custom",
  ]);
  const key = allowed.has(keyInput as FinancePeriodKey)
    ? (keyInput as FinancePeriodKey)
    : "this_month";

  const todayDate = dateAtUtc(today);
  const year = todayDate.getUTCFullYear();
  const month = todayDate.getUTCMonth();

  if (key === "all_time") {
    return {
      key,
      label: "All time",
      from: null,
      to: null,
      previousFrom: null,
      previousTo: null,
    };
  }

  if (key === "this_year") {
    return {
      key,
      label: `${year}`,
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      previousFrom: `${year - 1}-01-01`,
      previousTo: `${year - 1}-12-31`,
    };
  }

  if (key === "last_month") {
    const target = new Date(Date.UTC(year, month - 1, 1));
    const targetYear = target.getUTCFullYear();
    const targetMonth = target.getUTCMonth();
    const previous = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    return {
      key,
      label: monthLabel(targetYear, targetMonth),
      from: monthStart(targetYear, targetMonth),
      to: monthEnd(targetYear, targetMonth),
      previousFrom: monthStart(previous.getUTCFullYear(), previous.getUTCMonth()),
      previousTo: monthEnd(previous.getUTCFullYear(), previous.getUTCMonth()),
    };
  }

  if (key === "custom") {
    const from = customFrom && ISO_DATE_PATTERN.test(customFrom) ? customFrom : today;
    const to =
      customTo && ISO_DATE_PATTERN.test(customTo) && customTo >= from
        ? customTo
        : from;
    const durationDays =
      Math.floor((dateAtUtc(to).getTime() - dateAtUtc(from).getTime()) / 86_400_000) + 1;
    return {
      key,
      label: `${from} to ${to}`,
      from,
      to,
      previousFrom: addDays(from, -durationDays),
      previousTo: addDays(from, -1),
    };
  }

  const currentFrom = monthStart(year, month);
  const previous = new Date(Date.UTC(year, month - 1, 1));
  return {
    key: "this_month",
    label: monthLabel(year, month),
    from: currentFrom,
    to: monthEnd(year, month),
    previousFrom: monthStart(previous.getUTCFullYear(), previous.getUTCMonth()),
    previousTo: monthEnd(previous.getUTCFullYear(), previous.getUTCMonth()),
  };
}

export function isCollectedPayment(collection: FinanceCollection) {
  return (
    (collection.status === "PAID" || collection.status === "PARTIALLY_PAID") &&
    Number(collection.paid_amount) > 0
  );
}

export function calculateFinanceSummary(
  collections: FinanceCollection[],
  expenses: FinanceExpense[]
) {
  const income = collections
    .filter(isCollectedPayment)
    .reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const expense = expenses
    .filter((item) => item.status === "POSTED")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    income,
    expense,
    netProfit: income - expense,
    collectionCount: collections.filter(isCollectedPayment).length,
    expenseCount: expenses.filter((item) => item.status === "POSTED").length,
  };
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatFinanceCurrency(value: number, currency = "BDT") {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
