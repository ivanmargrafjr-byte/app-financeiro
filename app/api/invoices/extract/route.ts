import { NextResponse } from "next/server"

import { extractInvoiceLineItems } from "@/lib/anthropic/invoiceExtraction"

const MAX_FILE_BYTES = 32 * 1024 * 1024
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")
  const referenceMonth = formData.get("referenceMonth")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Envie uma imagem ou PDF da fatura" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande" }, { status: 400 })
  }
  if (typeof referenceMonth !== "string" || !/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return NextResponse.json({ error: "Mês de referência inválido" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64Data = buffer.toString("base64")

  try {
    const items = await extractInvoiceLineItems(
      base64Data,
      file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      referenceMonth
    )
    return NextResponse.json({ items })
  } catch (error) {
    console.error("[invoices/extract] extraction failed:", error)
    return NextResponse.json(
      { error: "Não foi possível extrair os dados da fatura" },
      { status: 422 }
    )
  }
}
