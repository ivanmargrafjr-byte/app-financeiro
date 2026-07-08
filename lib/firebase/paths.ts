import { collection, doc } from "firebase/firestore"
import { db } from "./client"

export function userDocRef(uid: string) {
  return doc(db, "users", uid)
}

export function accountsCol(uid: string) {
  return collection(db, "users", uid, "accounts")
}
export function accountDocRef(uid: string, accountId: string) {
  return doc(db, "users", uid, "accounts", accountId)
}

export function cardsCol(uid: string) {
  return collection(db, "users", uid, "cards")
}
export function cardDocRef(uid: string, cardId: string) {
  return doc(db, "users", uid, "cards", cardId)
}

export function categoriesCol(uid: string) {
  return collection(db, "users", uid, "categories")
}
export function categoryDocRef(uid: string, categoryId: string) {
  return doc(db, "users", uid, "categories", categoryId)
}

export function transactionsCol(uid: string) {
  return collection(db, "users", uid, "transactions")
}
export function transactionDocRef(uid: string, transactionId: string) {
  return doc(db, "users", uid, "transactions", transactionId)
}

export function invoicesCol(uid: string) {
  return collection(db, "users", uid, "invoices")
}
export function invoiceDocRef(uid: string, invoiceId: string) {
  return doc(db, "users", uid, "invoices", invoiceId)
}

export function recurringRulesCol(uid: string) {
  return collection(db, "users", uid, "recurringRules")
}
export function recurringRuleDocRef(uid: string, ruleId: string) {
  return doc(db, "users", uid, "recurringRules", ruleId)
}

export function contractsCol(uid: string) {
  return collection(db, "users", uid, "contracts")
}
export function contractDocRef(uid: string, contractId: string) {
  return doc(db, "users", uid, "contracts", contractId)
}
export function contractFileStoragePath(uid: string, contractId: string, fileName: string) {
  return `users/${uid}/contracts/${contractId}/${fileName}`
}
