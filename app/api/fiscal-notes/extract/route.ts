import { NextResponse } from "next/server"

import { extractFiscalNote } from "@/lib/anthropic/fiscalNoteExtraction"

// Same reasoning as the fatura import: reading a scanned note can outlast the default timeout.
export const maxDuration = 60

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
    return NextResponse.json({ error: "Envie uma imagem ou PDF da nota fiscal" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64Data = buffer.toString("base64")

  try {
    const extracted = await extractFiscalNote(base64Data, file.type)
    return NextResponse.json(extracted)
  } catch (error) {
    console.error("[fiscal-notes/extract] extraction failed:", error)
    return NextResponse.json(
      { error: "Não foi possível extrair os dados da nota fiscal" },
      { status: 422 }
    )
  }
}
