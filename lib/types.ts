import type { DateString, MonthString } from "@/lib/domain/dateUtils"

export type AccountType = "corrente" | "poupanca" | "carteira"

export type Account = {
  id: string
  name: string
  type: AccountType
  initialBalanceCents: number
  currentBalanceCents: number
  icon: string
  color: string
  archived: boolean
  createdAt: number
  updatedAt: number
}

export type Card = {
  id: string
  name: string
  limitCents: number
  closingDay: number
  dueDay: number
  linkedAccountId: string
  icon: string
  color: string
  archived: boolean
  createdAt: number
}

export type CategoryType = "receita" | "despesa"

export type Category = {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  archived: boolean
  isDefault: boolean
  parentId: string | null
}

export type TransactionOrigin = "account" | "card"
export type TransactionDirection = "in" | "out"

export type Transaction = {
  id: string
  origin: TransactionOrigin
  direction: TransactionDirection
  amountCents: number
  description: string
  notes?: string
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  date: DateString
  competenceMonth: MonthString
  createdAt: number
  updatedAt: number

  /** Only meaningful for origin === 'account': whether this entry has been applied to the account balance yet. */
  settled: boolean

  // origin === 'account'
  accountId?: string
  recurringSeriesId?: string
  /**
   * Set when this account entry was efetivada by paying with a card instead of debiting
   * an account: the doc is kept in place (same date/month) as a checked historical marker,
   * but the real charge — and the amount counted in monthly totals — lives in the separate
   * card-origin transaction(s) referenced by linkedCardId/linkedInvoiceId.
   */
  settledVia?: "card"
  linkedCardId?: string
  linkedInvoiceId?: string
  /** Every card-origin transaction id created when settling via card (one per parcela). */
  linkedTransactionIds?: string[]

  // origin === 'card'
  cardId?: string
  invoiceId?: string
  installmentGroupId?: string
  installmentNumber?: number
  installmentTotal?: number
}

export type InvoiceStatus = "open" | "paid"

export type Invoice = {
  id: string
  cardId: string
  referenceMonth: MonthString
  closingDate: DateString
  dueDate: DateString
  totalAmountCents: number
  status: InvoiceStatus
  paidAt?: number
  paidFromAccountId?: string
  paidTransactionId?: string
  createdAt: number
  updatedAt: number
}

export type RecurringRule = {
  id: string
  description: string
  amountCents: number
  categoryId: string
  accountId: string
  direction: TransactionDirection
  dayOfMonth: number
  startMonth: MonthString
  endMonth: MonthString | null
  active: boolean
  excludedMonths: string[]
  createdAt: number
  updatedAt: number
}

export type Contract = {
  id: string
  number: string
  contractor: string
  contractee: string
  scope: string
  startDate: DateString
  endDate: DateString
  executionDays: number | null
  paymentMethod: string
  valueCents: number | null
  notes: string | null
  fileName: string | null
  fileUrl: string | null
  fileStoragePath: string | null
  archived: boolean
  createdAt: number
  updatedAt: number
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  carteira: "Carteira",
}

export const DEFAULT_CATEGORY_COLOR = "#64748b"
