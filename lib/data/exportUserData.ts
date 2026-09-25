import { getDoc, getDocs } from "firebase/firestore"

import {
  accountsCol,
  budgetsCol,
  cardsCol,
  categoriesCol,
  contractsCol,
  goalsCol,
  importsCol,
  invoicesCol,
  recurringRulesCol,
  transactionsCol,
  userDocRef,
} from "@/lib/firebase/paths"

/**
 * Everything the app holds about one person, as plain JSON.
 *
 * Read with the user's own credentials, through the same rules every screen obeys:
 * an export that needed privileged access would be a second door into the data it
 * exists to hand over.
 */
export async function exportUserData(uid: string): Promise<string> {
  const collections = {
    contas: accountsCol(uid),
    cartoes: cardsCol(uid),
    categorias: categoriesCol(uid),
    transacoes: transactionsCol(uid),
    faturas: invoicesCol(uid),
    recorrencias: recurringRulesCol(uid),
    contratos: contractsCol(uid),
    orcamentos: budgetsCol(uid),
    metas: goalsCol(uid),
    importacoes: importsCol(uid),
  }

  const names = Object.keys(collections)
  const [profileSnap, ...snaps] = await Promise.all([
    getDoc(userDocRef(uid)),
    ...Object.values(collections).map((col) => getDocs(col)),
  ])

  const data: Record<string, unknown> = {
    exportadoEm: new Date().toISOString(),
    perfil: profileSnap.data() ?? null,
  }
  names.forEach((name, i) => {
    data[name] = snaps[i].docs.map((d) => ({ id: d.id, ...d.data() }))
  })

  return JSON.stringify(data, null, 2)
}

export function exportFileName(): string {
  return `folego-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
}
