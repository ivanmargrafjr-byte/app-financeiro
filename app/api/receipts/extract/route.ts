import { NextResponse } from "next/server"

import { extractReceipt } from "@/lib/anthropic/receiptExtraction"

const MAX_FILE_BYTES = 20 * 1024 * 1024
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Envie uma imagem ou PDF do recibo" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64Data = buffer.toString("base64")

  try {
    const extracted = await extractReceipt(base64Data, file.type)
    return NextResponse.json(extracted)
  } catch (error) {
    console.error("[receipts/extract] extraction failed:", error)
    return NextResponse.json(
      { error: "Não foi possível extrair os dados do recibo" },
      { status: 422 }
    )
  }
}
