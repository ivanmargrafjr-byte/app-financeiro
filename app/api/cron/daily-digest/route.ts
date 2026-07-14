import { NextResponse } from "next/server"

import { sendDailyDigest } from "@/lib/email/dailyDigest"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendDailyDigest()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[cron/daily-digest] failed:", error)
    return NextResponse.json({ error: "Falha ao gerar o resumo diário" }, { status: 500 })
  }
}
