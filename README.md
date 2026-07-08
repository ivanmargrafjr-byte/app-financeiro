# Finanças — Controle Financeiro Pessoal

App web para controle financeiro pessoal: contas bancárias, cartões de crédito com faturas, categorias, transações recorrentes e compras parceladas, contratos, com acompanhamento mensal.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS)
- [Firebase](https://firebase.google.com) — Auth (e-mail/senha) + Firestore + Storage (arquivos de contratos)
- [TanStack React Query](https://tanstack.com/query) para data fetching
- [shadcn/ui](https://ui.shadcn.com) (base-ui) + [Recharts](https://recharts.org)
- [Vitest](https://vitest.dev) para testes da lógica de domínio

## Configuração local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [console do Firebase](https://console.firebase.google.com):
   - Ative **Authentication** com o provedor E-mail/senha
   - Crie um banco **Firestore Database** (modo produção)
   - Ative o **Storage** (usado para os arquivos dos contratos)
   - Registre um app Web e copie as credenciais (`firebaseConfig`)
   - Em **Firestore Database → Regras**, publique o conteúdo de [`firestore.rules`](firestore.rules)
   - Em **Storage → Regras**, publique o conteúdo de [`storage.rules`](storage.rules)

3. Copie `.env.local.example` para `.env.local` e preencha com as credenciais do Firebase:

   ```bash
   cp .env.local.example .env.local
   ```

4. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servidor de produção (após build)
- `npm run lint` — ESLint
- `npm test` — testes unitários (Vitest), focados em `lib/domain/*`

## Estrutura

```
app/                  rotas (App Router)
  (auth)/              login, cadastro
  (app)/               área autenticada: dashboard, contas, cartões, transações, categorias, recorrências, contratos
components/
  ui/                  primitivos shadcn/ui
  forms/               formulários de cada entidade
  charts/              gráficos do dashboard
  layout/              shell, navegação, seletor de mês
lib/
  domain/              lógica pura (ciclo de fatura, parcelamento, recorrência, dinheiro, datas) — testada em *.test.ts
  firebase/             inicialização, paths do Firestore, seed de categorias padrão
  hooks/               hooks de dados (React Query + Firestore) por entidade
  validators/          schemas Zod por formulário
firestore.rules         regras de segurança (isolamento por usuário)
firestore.indexes.json  índices do Firestore (nenhum composto necessário no momento)
storage.rules           regras de segurança do Storage (arquivos de contratos)
```

## Modelo de dados

Tudo vive sob `users/{uid}/...` no Firestore: `accounts`, `cards`, `categories`, `transactions` (coleção unificada para lançamentos de conta e compras de cartão), `invoices` (faturas, ID determinístico `${cardId}_${referenceMonth}`), `recurringRules` e `contracts` (número, contratante, contratado, escopo, vigência, prazo de execução, forma de pagamento, valor e o arquivo anexado). O arquivo de cada contrato fica no Storage em `users/{uid}/contracts/{contractId}/{fileName}`.

## Deploy

Recomendado: [Vercel](https://vercel.com/new), configurando as mesmas variáveis de `.env.local` nas Environment Variables do projeto.
