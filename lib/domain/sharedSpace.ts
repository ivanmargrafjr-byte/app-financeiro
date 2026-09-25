/**
 * Money shared with other people, kept apart from each person's own finances.
 *
 * The space holds only what someone decided to put in it. Nothing is read from a
 * participant's accounts, cards or entries — sharing the house expenses cannot become
 * a window into a salary, and the only way to guarantee that is for the shared data
 * to be a separate thing rather than a filtered view of a private one.
 */

import { splitCents } from "@/lib/domain/money"
import type { DateString } from "@/lib/domain/dateUtils"

export type SpaceMember = {
  uid: string
  email: string
  name: string | null
  /** The owner is the only one who can remove people or delete the space. */
  role: "dono" | "membro"
}

export type SharedExpense = {
  id: string
  description: string
  amountCents: number
  date: DateString
  /** Who actually paid — not necessarily who created the entry. */
  paidByUid: string
  /** Who owes, and how much. The values always add up to amountCents. */
  splitCentsByUid: Record<string, number>
  createdByUid: string
  createdAt: number
}

/** A payment from one participant to another to settle up. */
export type Settlement = {
  id: string
  fromUid: string
  toUid: string
  amountCents: number
  date: DateString
  createdAt: number
}

/**
 * Splits an amount between participants, in cents, with no cent left behind.
 *
 * Equal shares use the same exact splitter the instalments use: three people and
 * R$ 10,00 is 3,34 / 3,33 / 3,33, never three times 3,33 with a cent missing from
 * the total.
 */
export function splitEqually(amountCents: number, uids: string[]): Record<string, number> {
  const parts = splitCents(amountCents, uids.length)
  return Object.fromEntries(uids.map((uid, i) => [uid, parts[i]]))
}

/**
 * Splits by weight — for "ele ganha o dobro, paga o dobro".
 *
 * The rounding leftovers go to the largest weights first, so the people paying more
 * absorb the cents rather than the arithmetic silently favouring them.
 */
export function splitByWeight(
  amountCents: number,
  weights: Record<string, number>
): Record<string, number> {
  const uids = Object.keys(weights)
  const totalWeight = uids.reduce((sum, uid) => sum + Math.max(0, weights[uid]), 0)
  if (totalWeight <= 0) return splitEqually(amountCents, uids)

  const exact = uids.map((uid) => ({
    uid,
    value: (amountCents * Math.max(0, weights[uid])) / totalWeight,
  }))
  const floored = exact.map((entry) => ({ ...entry, cents: Math.floor(entry.value) }))
  let leftover = amountCents - floored.reduce((sum, entry) => sum + entry.cents, 0)

  const order = [...floored].sort(
    (a, b) => b.value - b.cents - (a.value - a.cents) || weights[b.uid] - weights[a.uid]
  )
  for (const entry of order) {
    if (leftover <= 0) break
    entry.cents += 1
    leftover -= 1
  }

  return Object.fromEntries(floored.map((entry) => [entry.uid, entry.cents]))
}

export type Balance = { uid: string; cents: number }

/**
 * What each participant is owed (positive) or owes (negative).
 *
 * Paying for something and consuming it are counted separately, which is what keeps
 * a reimbursement from erasing the expense: the dinner still happened and still cost
 * what it cost, the transfer afterwards only moves who is holding the money.
 */
export function balances(
  expenses: SharedExpense[],
  settlements: Settlement[],
  memberUids: string[]
): Balance[] {
  const byUid = new Map(memberUids.map((uid) => [uid, 0]))
  const add = (uid: string, cents: number) => {
    if (!byUid.has(uid)) return
    byUid.set(uid, (byUid.get(uid) ?? 0) + cents)
  }

  for (const expense of expenses) {
    add(expense.paidByUid, expense.amountCents)
    for (const [uid, cents] of Object.entries(expense.splitCentsByUid)) add(uid, -cents)
  }
  for (const settlement of settlements) {
    add(settlement.fromUid, settlement.amountCents)
    add(settlement.toUid, -settlement.amountCents)
  }

  return [...byUid].map(([uid, cents]) => ({ uid, cents }))
}

export type Transfer = { fromUid: string; toUid: string; cents: number }

/**
 * The shortest set of transfers that settles everyone up.
 *
 * Greedy, biggest debtor to biggest creditor: it produces at most one transfer fewer
 * than the number of people, which is what stops a group of four from ending the
 * month owing each other in a circle.
 */
export function settleUp(balances: Balance[]): Transfer[] {
  const debtors = balances.filter((b) => b.cents < 0).map((b) => ({ ...b }))
  const creditors = balances.filter((b) => b.cents > 0).map((b) => ({ ...b }))
  debtors.sort((a, b) => a.cents - b.cents)
  creditors.sort((a, b) => b.cents - a.cents)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].cents, creditors[j].cents)
    if (amount > 0) {
      transfers.push({ fromUid: debtors[i].uid, toUid: creditors[j].uid, cents: amount })
      debtors[i].cents += amount
      creditors[j].cents -= amount
    }
    if (debtors[i].cents === 0) i++
    if (creditors[j].cents === 0) j++
  }
  return transfers
}
