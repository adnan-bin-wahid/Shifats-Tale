"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatFinanceCurrency } from "@/lib/finance/finance-domain";

export type FinanceMonthlyChartPoint = {
  month: string;
  income: number;
  expense: number;
  profit: number;
};

export type FinanceCategoryChartPoint = {
  name: string;
  value: number;
  color: string;
};

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-black text-primary">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-6 text-[11px]">
          <span className="font-bold" style={{ color: item.color }}>
            {item.name}
          </span>
          <span className="font-black text-slate-800">
            {formatFinanceCurrency(Number(item.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FinanceCharts({
  monthlyData,
  categoryData,
}: {
  monthlyData: FinanceMonthlyChartPoint[];
  categoryData: FinanceCategoryChartPoint[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            12-month comparison
          </p>
          <h2 className="mt-1 text-lg font-black text-primary">
            Collection, expense & net profit
          </h2>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 12 }}
              />
              <Bar name="Collected fees" dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar name="Expenses" dataKey="expense" fill="#F97316" radius={[6, 6, 0, 0]} />
              <Line
                name="Net profit"
                type="monotone"
                dataKey="profit"
                stroke="#010E62"
                strokeWidth={3}
                dot={{ r: 3, fill: "#010E62" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            Selected period
          </p>
          <h2 className="mt-1 text-lg font-black text-primary">Expense distribution</h2>
        </div>
        {categoryData.some((item) => item.value > 0) ? (
          <>
            <div className="h-[245px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={57}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatFinanceCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2">
              {categoryData
                .filter((item) => item.value > 0)
                .slice(0, 6)
                .map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex min-w-0 items-center gap-2 font-bold text-slate-600">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 font-black text-slate-900">
                      {formatFinanceCurrency(item.value)}
                    </span>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div className="flex h-[310px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
            <p className="text-center text-xs font-bold text-muted">
              No posted expense in this period.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
