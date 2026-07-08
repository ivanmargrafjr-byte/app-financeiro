import { NextResponse } from "next/server"

import { extractContractFromPdf } from "@/lib/anthropic/contractExtraction"

const MAX_FILE_BYTES = 32 * 1024 * 1024 // limit documented for PDF document blocks

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Envie um arquivo PDF" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64Pdf = buffer.toString("base64")

  try {
    const extracted = await extractContractFromPdf(base64Pdf)
    return NextResponse.json(extracted)
  } catch (error) {
    console.error("[contracts/extract] extraction failed:", error)
    return NextResponse.json(
      { error: "Não foi possível extrair os dados do contrato" },
      { status: 422 }
    )
  }
}
