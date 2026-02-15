const Privacidade = () => (
  <div className="min-h-screen bg-background px-4 py-10 max-w-3xl mx-auto text-foreground">
    <h1 className="text-2xl font-bold mb-6">POLÍTICA DE PRIVACIDADE - FATIA DO LUCRO</h1>
    <p className="text-sm text-muted-foreground mb-8">Em conformidade com a Lei Geral de Proteção de Dados (LGPD)</p>

    <section className="space-y-6 text-sm leading-relaxed">
      <div>
        <h2 className="font-semibold text-base mb-2">1. COLETA DE DADOS</h2>
        <p>Coletamos apenas os dados essenciais para o funcionamento do sistema:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Dados Pessoais:</strong> Nome, E-mail e ID de usuário.</li>
          <li><strong>Dados de Negócio:</strong> Receitas, custos de ingredientes, histórico de vendas e preços.</li>
        </ul>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">2. FINALIDADE</h2>
        <p>Seus dados são utilizados exclusivamente para:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Permitir o acesso à sua conta.</li>
          <li>Processar pagamentos e assinaturas.</li>
          <li>Gerar seus relatórios de custos e lucros.</li>
          <li>Enviar comunicados importantes sobre sua conta.</li>
        </ul>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">3. COMPARTILHAMENTO</h2>
        <p>Nós <strong>NÃO</strong> vendemos seus dados. Compartilhamos informações apenas com parceiros essenciais para a operação:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Mercado Pago:</strong> Para processamento financeiro (não temos acesso aos números completos do seu cartão de crédito).</li>
          <li><strong>Supabase:</strong> Para armazenamento seguro do banco de dados.</li>
        </ul>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">4. SEGURANÇA</h2>
        <p>Adotamos práticas modernas de segurança e criptografia para proteger suas receitas e informações financeiras.</p>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">5. SEUS DIREITOS (LGPD)</h2>
        <p>Você tem o direito de solicitar, a qualquer momento:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>A confirmação da existência de tratamento de dados.</li>
          <li>O acesso aos seus dados.</li>
          <li>A correção de dados incompletos ou desatualizados.</li>
          <li>A exclusão da sua conta e de todos os seus dados dos nossos servidores.</li>
        </ul>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2">6. CONTATO</h2>
        <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo e-mail: <a href="mailto:contato.fatiadolucro@gmail.com" className="text-primary underline">contato.fatiadolucro@gmail.com</a></p>
      </div>
    </section>
  </div>
);

export default Privacidade;
