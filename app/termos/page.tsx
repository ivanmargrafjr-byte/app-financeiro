import Link from "next/link"

export const metadata = {
  title: "Termos de Uso — Finanças",
}

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed">
      <Link href="/login" className="text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Termos de Uso</h1>
      <p className="text-muted-foreground mt-1 mb-8 text-xs">Última atualização: julho de 2026</p>

      <div className="grid gap-6">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. Sobre o serviço</h2>
          <p>
            Finanças é um aplicativo de controle financeiro pessoal. Ao criar uma conta, você
            concorda com estes Termos de Uso e com a nossa{" "}
            <Link href="/privacidade" className="underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. Assinatura e cobrança</h2>
          <p>
            O acesso ao aplicativo é feito por assinatura mensal de R$ 19,90, com 7 dias de teste
            grátis a partir da primeira assinatura. Após o período de teste, a cobrança é feita
            automaticamente todo mês na mesma data, através da plataforma de pagamentos Stripe,
            até que a assinatura seja cancelada.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. Cancelamento</h2>
          <p>
            Você pode cancelar sua assinatura a qualquer momento pela tela "Assinatura" dentro do
            aplicativo. O cancelamento interrompe cobranças futuras; o acesso permanece disponível
            até o fim do período já pago. Não fazemos reembolso de períodos parciais já cobrados,
            exceto quando exigido por lei.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. Uso da conta</h2>
          <p>
            Você é responsável por manter a confidencialidade da sua senha e por todas as
            atividades realizadas na sua conta. Os dados financeiros inseridos no aplicativo são
            de sua exclusiva responsabilidade quanto à exatidão.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. Isenção de responsabilidade</h2>
          <p>
            O Finanças é uma ferramenta de organização financeira pessoal e não constitui
            aconselhamento financeiro, contábil ou de investimento. As funcionalidades de leitura
            automática de documentos por inteligência artificial podem ocasionalmente extrair
            dados incorretos — revise sempre os lançamentos antes de confirmá-los.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Alterações no serviço e nestes termos</h2>
          <p>
            Podemos atualizar estes termos ou alterar funcionalidades do aplicativo a qualquer
            momento. Mudanças relevantes no preço da assinatura serão comunicadas com antecedência.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Encerramento de conta</h2>
          <p>
            Você pode solicitar o encerramento da sua conta e a exclusão dos seus dados a qualquer
            momento pelo contato abaixo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">8. Contato</h2>
          <p>
            Dúvidas sobre estes termos podem ser enviadas para{" "}
            <a href="mailto:ivan@margraf.tec.br" className="underline">
              ivan@margraf.tec.br
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
