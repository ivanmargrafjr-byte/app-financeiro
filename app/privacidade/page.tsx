import Link from "next/link"

export const metadata = {
  title: "Política de Privacidade — Finanças",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed">
      <Link href="/login" className="text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Política de Privacidade</h1>
      <p className="text-muted-foreground mt-1 mb-8 text-xs">Última atualização: julho de 2026</p>

      <div className="grid gap-6">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. Sobre este aplicativo</h2>
          <p>
            Finanças é um aplicativo de controle financeiro pessoal, usado para registrar
            contas bancárias, cartões de crédito, transações, categorias e recorrências. Esta
            política explica quais dados o aplicativo coleta, como são usados e com quem podem
            ser compartilhados. Veja também os{" "}
            <Link href="/termos" className="underline">
              Termos de Uso
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. Dados que coletamos</h2>
          <p>Coletamos apenas os dados necessários para o funcionamento do aplicativo:</p>
          <ul className="mt-2 list-disc pl-5 [&>li]:mt-1">
            <li>
              <strong>Dados de conta:</strong> nome e e-mail, usados para autenticação (login).
            </li>
            <li>
              <strong>Dados financeiros inseridos por você:</strong> contas, cartões, transações,
              categorias, faturas, recorrências e valores associados.
            </li>
            <li>
              <strong>Documentos enviados para leitura automática:</strong> imagens ou PDFs de
              recibos, faturas de cartão e contratos que você opta por enviar para preenchimento
              automático de lançamentos. Esses arquivos são processados no momento do envio e não
              são armazenados após a extração dos dados, exceto quando você explicitamente anexa
              um contrato à sua conta.
            </li>
            <li>
              <strong>Ícones personalizados:</strong> imagens que você escolhe enviar para
              identificar contas, cartões ou categorias.
            </li>
            <li>
              <strong>Dados de pagamento da assinatura:</strong> ao assinar, os dados do seu
              cartão são inseridos diretamente na página segura do Stripe — não temos acesso ao
              número do cartão. Recebemos apenas a confirmação do pagamento e o status da
              assinatura.
            </li>
          </ul>
          <p className="mt-2">
            Não coletamos dados de localização, contatos, ou qualquer informação do dispositivo
            além do necessário para autenticação e funcionamento do app. Não usamos cookies de
            rastreamento ou publicidade.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. Como usamos seus dados</h2>
          <ul className="list-disc pl-5 [&>li]:mt-1">
            <li>Exibir e organizar suas informações financeiras dentro do aplicativo.</li>
            <li>
              Gerar automaticamente lançamentos a partir de recibos, faturas e contratos enviados
              por você, usando um serviço de inteligência artificial para leitura de documentos.
            </li>
            <li>
              Enviar, quando configurado, um e-mail diário com um resumo das pendências
              financeiras do dia.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. Compartilhamento com terceiros</h2>
          <p>
            Não vendemos nem alugamos seus dados. Utilizamos os seguintes prestadores de serviço
            (subprocessadores) para operar o aplicativo, cada um recebendo apenas os dados
            estritamente necessários à sua função:
          </p>
          <ul className="mt-2 list-disc pl-5 [&>li]:mt-1">
            <li>
              <strong>Google Firebase</strong> (autenticação, banco de dados e armazenamento de
              arquivos) — hospeda seus dados financeiros e arquivos enviados.
            </li>
            <li>
              <strong>Anthropic</strong> — processa imagens e PDFs de recibos, faturas e
              contratos que você envia, para extrair automaticamente descrição, valor e data.
            </li>
            <li>
              <strong>Resend</strong> — envia o e-mail diário de pendências, quando configurado.
            </li>
            <li>
              <strong>Stripe</strong> — processa o pagamento da assinatura mensal. O Stripe é
              certificado PCI-DSS nível 1 (o mais alto padrão de segurança para processamento de
              cartões); não armazenamos nem temos acesso aos dados do seu cartão.
            </li>
            <li>
              <strong>Vercel</strong> — hospeda a aplicação web.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. Armazenamento e segurança</h2>
          <p>
            Seus dados ficam isolados por conta de usuário: regras de segurança no banco de dados
            garantem que apenas você (autenticado) tenha acesso às suas informações. Os dados
            trafegam sempre por conexão criptografada (HTTPS).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Retenção e exclusão de dados</h2>
          <p>
            Seus dados são mantidos enquanto sua conta existir. Para solicitar a exclusão da sua
            conta e de todos os dados associados, entre em contato pelo e-mail abaixo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Seus direitos</h2>
          <p>
            Nos termos da Lei Geral de Proteção de Dados (LGPD), você tem direito a acessar,
            corrigir, portar ou solicitar a exclusão dos seus dados pessoais a qualquer momento,
            entrando em contato pelo e-mail abaixo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">8. Uso por menores de idade</h2>
          <p>Este aplicativo não é direcionado a menores de 18 anos.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">9. Alterações nesta política</h2>
          <p>
            Esta política pode ser atualizada periodicamente. A data da última atualização é
            exibida no topo desta página.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">10. Contato</h2>
          <p>
            Dúvidas sobre esta política ou sobre seus dados podem ser enviadas para{" "}
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
