"use client"

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCentsBRL } from "@/lib/domain/money"

export function IncomeExpenseBarChart({
  receitasCents,
  despesasCents,
}: {
  receitasCents: number
  despesasCents: number
}) {
  const data = [
    { name: "Receitas", value: receitasCents, fill: "#16a34a" },
    { name: "Despesas", value: despesasCents, fill: "#ef4444" },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis hide />
        <Tooltip
          formatter={(value) => formatCentsBRL(Number(value))}
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
