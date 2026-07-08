"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { formatCentsBRL } from "@/lib/domain/money"

export type CategorySlice = {
  categoryId: string
  name: string
  icon: string
  iconUrl?: string
  color: string
  amountCents: number
}

export function CategoryPieChart({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Sem despesas categorizadas neste mês.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amountCents"
          nameKey="name"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((slice) => (
            <Cell key={slice.categoryId} fill={slice.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatCentsBRL(Number(value)), String(name)]}
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
