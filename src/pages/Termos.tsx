const Termos = () => (
  <div className="min-h-screen bg-background px-4 py-10 max-w-3xl mx-auto text-foreground">
    <h1 className="text-2xl font-bold mb-6">TERMOS DE USO - FATIA DO LUCRO</h1>
    <p className="text-sm text-muted-foreground mb-8">Última atualização: Fevereiro de 2026</p>

    <section className="space-y-6 text-sm leading-relaxed">
      <div>
        <h2 className="font-semibold text-base mb-2">1. O SERVIÇO</h2>
        <p>O "Fatia do Lucro" é uma plataforma SaaS (Software as a Service) desenvolvida para auxiliar empreendedores na precificação de produtos e gestão financeira.</p>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">2. LIMITAÇÃO DE RESPONSABILIDADE (IMPORTANTE)</h2>
        <p>O Fatia do Lucro fornece cálculos baseados nos dados inseridos pelo usuário. O usuário reconhece que é o único responsável pela conferência final dos preços e pela tomada de decisão comercial. Não nos responsabilizamos por eventuais prejuízos financeiros, perda de lucro ou erros de inserção de dados. O software é uma ferramenta de apoio, não um consultor financeiro.</p>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">3. ASSINATURA E PAGAMENTOS</h2>
        <p>O serviço opera no modelo de assinatura recorrente (mensal ou anual). Os pagamentos são processados de forma segura pelo Mercado Pago.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Renovação:</strong> A renovação é automática, salvo se cancelada antes do vencimento.</li>
          <li><strong>Reajustes:</strong> Reservamo-nos o direito de reajustar os valores dos planos, mediante aviso prévio por e-mail.</li>
        </ul>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">4. CANCELAMENTO</h2>
        <p>O usuário pode cancelar a assinatura a qualquer momento através do painel de controle. O cancelamento interrompe cobranças futuras, mas não gera reembolso proporcional do período já pago (o acesso continua ativo até o fim do ciclo vigente).</p>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">5. DISPONIBILIDADE</h2>
        <p>Nos esforçamos para manter o sistema online 99% do tempo, mas interrupções para manutenção ou falhas técnicas podem ocorrer.</p>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">6. ALTERAÇÕES</h2>
        <p>Estes termos podem ser atualizados a qualquer momento. O uso contínuo do sistema implica na aceitação das novas regras.</p>
      </div>
    </section>
  </div>
);

export default Termos;
