import "server-only"

import { adminDb } from "@/lib/firebaseAdmin/client"
import { resend } from "@/lib/email/resendClient"
import { formatCentsBRL } from "@/lib/domain/money"
import { todayDateString } from "@/lib/domain/dateUtils"

type PendingTransaction = {
  description: string
  amountCents: number
  direction: "in" | "out"
}

type DueInvoice = {
  cardName: string
  amountCents: number
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDatePtBR(date: string): string {
  return date.split("-").reverse().join("/")
}

function buildDigestHtml(
  date: string,
  pendingTransactions: PendingTransaction[],
  dueInvoices: DueInvoice[]
): string {
  const transactionsRows = pendingTransactions
    .map(
      (t) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(t.description)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:${
            t.direction === "in" ? "#059669" : "#111827"
          };">${t.direction === "in" ? "+" : "-"}${formatCentsBRL(t.amountCents)}</td>
        </tr>`
    )
    .join("")

  const invoicesRows = dueInvoices
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(i.cardName)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${formatCentsBRL(
            i.amountCents
          )}</td>
        </tr>`
    )
    .join("")

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:480px;margin:0 auto;color:#111827;">
      <h2 style="font-size:18px;margin-bottom:4px;">Pendências de hoje</h2>
      <p style="color:#6b7280;font-size:13px;margin-top:0;">${formatDatePtBR(date)}</p>
      ${
        pendingTransactions.length > 0
          ? `<h3 style="font-size:14px;margin-bottom:4px;">Lançamentos pendentes</h3>
             <table style="width:100%;border-collapse:collapse;font-size:14px;">${transactionsRows}</table>`
          : ""
      }
      ${
        dueInvoices.length > 0
          ? `<h3 style="font-size:14px;margin-top:20px;margin-bottom:4px;">Faturas vencendo hoje</h3>
             <table style="width:100%;border-collapse:collapse;font-size:14px;">${invoicesRows}</table>`
          : ""
      }
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Enviado automaticamente pelo Finanças.</p>
    </div>
  `
}

/**
 * Scans every user's Firestore data for today's pending account entries and card
 * invoices due today, and emails a single combined digest if there's anything to
 * report. Runs with Admin SDK credentials (bypasses security rules) since it's
 * triggered by a cron job with no signed-in user. Silent no-op on a quiet day —
 * no email sent when there's nothing pending.
 */
export async function sendDailyDigest(): Promise<{ sent: boolean; pendingCount: number }> {
  const today = todayDateString()

  const usersSnap = await adminDb.collection("users").get()

  const pendingTransactions: PendingTransaction[] = []
  const dueInvoices: DueInvoice[] = []

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id
    const userRef = adminDb.collection("users").doc(uid)

    const txSnap = await userRef
      .collection("transactions")
      .where("origin", "==", "account")
      .where("settled", "==", false)
      .where("date", "==", today)
      .get()

    for (const doc of txSnap.docs) {
      const data = doc.data()
      pendingTransactions.push({
        description: data.description as string,
        amountCents: data.amountCents as number,
        direction: data.direction as "in" | "out",
      })
    }

    const invoicesSnap = await userRef
      .collection("invoices")
      .where("status", "==", "open")
      .where("dueDate", "==", today)
      .get()

    for (const doc of invoicesSnap.docs) {
      const data = doc.data()
      const cardSnap = await userRef.collection("cards").doc(data.cardId as string).get()
      dueInvoices.push({
        cardName: (cardSnap.data()?.name as string | undefined) ?? "Cartão",
        amountCents: data.totalAmountCents as number,
      })
    }
  }

  const pendingCount = pendingTransactions.length + dueInvoices.length
  if (pendingCount === 0) {
    return { sent: false, pendingCount: 0 }
  }

  await resend.emails.send({
    from: process.env.DIGEST_EMAIL_FROM!,
    to: process.env.DIGEST_EMAIL_TO!,
    subject: `Pendências de hoje — ${formatDatePtBR(today)}`,
    html: buildDigestHtml(today, pendingTransactions, dueInvoices),
  })

  return { sent: true, pendingCount }
}
