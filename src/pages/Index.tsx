import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import "@/styles/landing.css";

const Index = () => {
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("visible"), i * 60);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggleFaq = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.classList.toggle("open");
  }, []);

  return (
    <div className="landing-page min-h-screen">
      {/* NAV */}
      <nav className={`landing-nav ${navScrolled ? "scrolled" : ""}`}>
        <a href="#" className="nav-logo-link">
          <img src={logo} alt="Fatia do Lucro" className="nav-logo-img" />
          Fatia do Lucro
        </a>
        <div className="nav-links-list">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <a href="#depoimentos">Depoimentos</a>
          <Link to="/auth?mode=login" className="nav-login-btn">Entrar</Link>
          <Link to="/auth" className="nav-cta-btn">Testar 7 dias grátis →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-bg-gradient" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="hero-inner">
          <div className="hero-badge">🚀 Novo: Relatórios em PDF para plano PRO</div>
          <h1 className="hero-title">
            Pare de <em>adivinhar</em><br />o preço do seu bolo.
          </h1>
          <p className="hero-sub">
            O Fatia do Lucro calcula automaticamente o custo de cada receita, controla seu financeiro e mostra exatamente quanto lucro você está ganhando — ou perdendo.
          </p>
          <div className="hero-actions">
            <Link to="/auth" className="btn-primary-landing">🎂 Começar grátis por 7 dias</Link>
            <a href="#como-funciona" className="btn-secondary-landing">▶ Ver como funciona</a>
          </div>
          <div className="hero-social-proof">
            <div className="avatars">
              <span>MG</span><span>RC</span><span>TS</span><span>PL</span><span>+</span>
            </div>
            <div className="social-text">
              <strong>+1.200 confeiteiros</strong><br />
              já controlam seu negócio com o Fatia do Lucro
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-strip">
        {[
          { number: "7 dias", label: "de teste grátis sem cartão" },
          { number: "R$0", label: "para começar a usar" },
          { number: "+1.200", label: "confeiteiros ativos" },
          { number: "4.9★", label: "avaliação média" },
        ].map((s) => (
          <div key={s.label} className="stat-item">
            <div className="stat-number">{s.number}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* PROBLEMA */}
      <section id="problema" className="section-problema">
        <p className="section-eyebrow reveal">O problema que ninguém fala</p>
        <h2 className="section-title reveal">Você trabalha muito<br />e lucra <em>pouco</em>.</h2>
        <p className="section-sub reveal">Não é falta de talento. É falta de número. A maioria dos confeiteiros cobra no feeling — e no final do mês não sobra nada.</p>

        <div className="problem-grid">
          <div className="problem-cards">
            {[
              { icon: "😰", title: "Preço no chute", desc: 'Você cobra o que "acha justo" sem saber se está cobrindo os custos reais de ingredientes, luz, gás e seu trabalho.' },
              { icon: "📊", title: "Sem controle financeiro", desc: "O dinheiro entra e sai sem registro. No fim do mês você não sabe se o negócio deu lucro ou prejuízo." },
              { icon: "📱", title: "Planilha que não funciona", desc: "Planilhas do Excel são lentas, complicadas e não funcionam bem no celular — onde você mais precisa." },
              { icon: "🤯", title: "Cada ingrediente tem custo diferente", desc: "Chocolate 70%, manteiga, ovo... calcular o custo por grama de cada um é um pesadelo que você evita." },
            ].map((p) => (
              <div key={p.title} className="problem-card reveal">
                <div className="problem-icon">{p.icon}</div>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="problem-visual reveal">
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", marginBottom: 20 }}>Bolo no Pote (12 unidades)</h3>
            {[
              { label: "Ingredientes", wrong: "R$ ?", right: null },
              { label: "Mão de obra (2h)", wrong: "R$ ???", right: null },
              { label: "Embalagem", wrong: "R$ ??", right: null },
              { label: "Taxa iFood (27,5%)", wrong: "Esqueci", right: null },
              { label: "Custo por unidade", wrong: "R$ 4,00?", right: "R$ 6,83" },
            ].map((r) => (
              <div key={r.label} className="calc-row">
                <span>{r.label}</span>
                <span className="wrong">{r.wrong}</span>
                {r.right && <span className="right">{r.right}</span>}
              </div>
            ))}
            <div className="calc-total">
              <p>⚠️ Vendendo a R$ 8,00 no iFood</p>
              <strong>Lucro real: R$ 0,41/un</strong>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", textAlign: "center", marginTop: 12 }}>Com o Fatia do Lucro, você vê isso em segundos</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funcionalidades" className="section-funcionalidades">
        <p className="section-eyebrow reveal">Tudo que você precisa</p>
        <h2 className="section-title reveal">Um sistema feito <em>para confeiteiro</em>,<br />não para contador.</h2>
        <p className="section-sub reveal">Simples no celular, poderoso nos bastidores. Cada funcionalidade resolve um problema real do dia a dia.</p>

        <div className="features-grid">
          {[
            { emoji: "🧂", title: "Cadastro de Ingredientes", desc: "Registre o preço pago e o tamanho da embalagem. O sistema calcula automaticamente o custo por grama, ml ou unidade.", badge: "Grátis" },
            { emoji: "🎂", title: "Calculadora de Receitas", desc: "Monte sua receita selecionando ingredientes e quantidades. Veja o custo total, custo por unidade e margem de lucro em tempo real.", badge: "Grátis" },
            { emoji: "👥", title: "Gestão de Clientes", desc: "Cadastre seus clientes, histórico de pedidos e informações de contato. Nunca mais perca uma encomenda.", badge: "Grátis" },
            { emoji: "📋", title: "Controle de Encomendas", desc: "Registre pedidos, datas de entrega e valores. Veja tudo que você tem para entregar em um único lugar.", badge: "Grátis" },
            { emoji: "💰", title: "Módulo Financeiro", desc: "Registre receitas e despesas, veja seu lucro líquido mensal e acompanhe a meta que você mesmo define.", badge: "PRO" },
            { emoji: "🧠", title: "Simuladores de Negócio", desc: 'Simule cenários: "quanto preciso vender para ganhar R$ 5.000?" ou "qual o ponto de equilíbrio do meu negócio?"', badge: "PRO" },
            { emoji: "🛒", title: "Lista de Compras", desc: "Gere automaticamente a lista de compras baseada nas receitas que você vai produzir. Sem esquecer nada no mercado.", badge: "Grátis" },
            { emoji: "📊", title: "Dashboard com Gráficos", desc: "Visualize receitas, despesas e lucro dos últimos 6 meses em gráficos claros. Tome decisões com dados reais.", badge: "Grátis" },
            { emoji: "📄", title: "Relatórios em PDF", desc: "Exporte fichas técnicas completas das suas receitas em PDF profissional para compartilhar ou imprimir.", badge: "PRO" },
          ].map((f) => (
            <div key={f.title} className="feature-card reveal">
              <span className="feature-emoji">{f.emoji}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="feature-badge">{f.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="section-como-funciona">
        <p className="section-eyebrow reveal">Em 4 passos simples</p>
        <h2 className="section-title reveal">Do zero ao <em>lucro calculado</em><br />em menos de 10 minutos.</h2>
        <div className="steps-grid">
          {[
            { num: 1, title: "Crie sua conta", desc: "Cadastro gratuito, sem cartão de crédito. 7 dias de acesso total ao plano PRO." },
            { num: 2, title: "Cadastre ingredientes", desc: "Informe o preço e tamanho de cada embalagem. O custo por grama é calculado automaticamente." },
            { num: 3, title: "Monte suas receitas", desc: "Selecione os ingredientes, defina as quantidades e veja o custo total na hora." },
            { num: 4, title: "Precifique com confiança", desc: "Defina seu preço de venda e veja a margem de lucro real. Sem chute, sem prejuízo." },
          ].map((s) => (
            <div key={s.num} className="step reveal">
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="section-planos">
        <p className="section-eyebrow reveal">Preços simples e honestos</p>
        <h2 className="section-title reveal">Comece grátis.<br /><em>Escale quando crescer.</em></h2>
        <p className="section-sub reveal">Sem cobrança surpresa. Sem fidelidade mínima. Cancele quando quiser.</p>

        <div className="pricing-grid">
          {/* FREE */}
          <div className="plan-card reveal">
            <div className="plan-name">Grátis</div>
            <div className="plan-price"><sup>R$</sup>0 <sub>/mês</sub></div>
            <p className="plan-desc">Para quem está começando e quer sentir o sistema antes de assinar.</p>
            <ul className="plan-features-list">
              <li>Até 15 ingredientes</li>
              <li>Até 5 receitas</li>
              <li>Até 10 clientes</li>
              <li>Até 10 encomendas</li>
              <li>Dashboard básico</li>
              <li className="locked">Módulo Financeiro</li>
              <li className="locked">Simuladores</li>
              <li className="locked">Relatórios PDF</li>
            </ul>
            <Link to="/auth" className="plan-cta">Criar conta grátis</Link>
          </div>

          {/* PRO */}
          <div className="plan-card featured reveal">
            <div className="plan-badge-label">⭐ Mais popular</div>
            <div className="plan-name">PRO</div>
            <div className="plan-price"><sup>R$</sup>19<small>,90</small> <sub>/mês</sub></div>
            <p className="plan-desc">Para confeiteiros sérios que querem controle total do negócio.</p>
            <ul className="plan-features-list">
              <li>Ingredientes ilimitados</li>
              <li>Receitas ilimitadas</li>
              <li>Clientes ilimitados</li>
              <li>Encomendas ilimitadas</li>
              <li>Dashboard completo</li>
              <li>Módulo Financeiro ✦</li>
              <li>Simuladores de negócio ✦</li>
              <li>Relatórios PDF ✦</li>
              <li>Suporte prioritário</li>
            </ul>
            <Link to="/auth" className="plan-cta featured-cta">Começar 7 dias grátis →</Link>
          </div>

          {/* VIP */}
          <div className="plan-card reveal">
            <div className="plan-name">PRO Indicado</div>
            <div className="plan-price"><sup>R$</sup>14<small>,99</small> <sub>/mês</sub></div>
            <p className="plan-desc">Desconto especial para quem foi indicado por outro usuário do Fatia do Lucro.</p>
            <ul className="plan-features-list">
              <li>Tudo do plano PRO</li>
              <li>25% de desconto vitalício</li>
              <li>Válido com código de indicação</li>
              <li>Mesmos 7 dias de trial</li>
            </ul>
            <Link to="/auth" className="plan-cta">Tenho um código →</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="depoimentos" className="section-depoimentos">
        <p className="section-eyebrow reveal">O que dizem nossas confeiteiras</p>
        <h2 className="section-title reveal">Elas pararam de <em>trabalhar de graça</em>.</h2>

        <div className="testimonials-grid">
          {[
            { text: "Antes eu cobrava R$ 35 no meu bolo de pote e achava que estava lucrando. Com o Fatia do Lucro descobri que estava perdendo dinheiro em cada venda. Hoje cobro R$ 52 e vendo mais ainda!", avatar: "🎂", name: "Mariana Gomes", role: "Confeiteira autônoma — São Paulo, SP" },
            { text: "O sistema é incrivelmente fácil de usar no celular. Em 10 minutos cadastrei todos meus ingredientes e já vi quanto custa cada produto. Nunca mais vou precificar no feeling.", avatar: "🍰", name: "Rafaela Costa", role: "Doceria Artesanal — Belo Horizonte, MG" },
            { text: "O módulo financeiro mudou minha vida. Finalmente sei quanto entrou, quanto saiu e quanto sobrou no mês. Meu marido não acreditou quando mostrei o relatório — parecia coisa de empresa grande!", avatar: "🧁", name: "Tatiane Silva", role: "Confeiteira PRO desde 2025 — Recife, PE" },
          ].map((t) => (
            <div key={t.name} className="testimonial reveal">
              <div className="stars">★★★★★</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{t.avatar}</div>
                <div>
                  <div className="author-name">{t.name}</div>
                  <div className="author-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section-faq">
        <p className="section-eyebrow reveal">Perguntas frequentes</p>
        <h2 className="section-title reveal">Ficou alguma <em>dúvida?</em></h2>

        <div className="faq-grid">
          {[
            { q: "Preciso informar cartão de crédito para testar?", a: "Não! Você cria sua conta e já tem 7 dias de acesso total ao plano PRO, completamente grátis, sem precisar inserir nenhum dado de pagamento." },
            { q: "Posso cancelar quando quiser?", a: "Sim, sem burocracia. Você cancela diretamente pelo painel do Mercado Pago, sem precisar entrar em contato com ninguém. Não existe multa ou fidelidade mínima." },
            { q: "Funciona no celular?", a: "O Fatia do Lucro foi desenvolvido mobile-first — ou seja, pensado primeiro para celular. Você pode usar pelo navegador do seu smartphone sem precisar instalar nenhum app." },
            { q: "Meus dados ficam seguros?", a: "Sim. Os dados são armazenados com criptografia e segurança de nível empresarial — o que significa que nenhum outro usuário pode ver seus dados." },
            { q: "Como funciona o pagamento?", a: "O pagamento é processado pelo Mercado Pago, a maior plataforma de pagamentos da América Latina. Você pode pagar com cartão de crédito, débito ou Pix." },
            { q: "O que acontece com meus dados se eu cancelar?", a: "Seus dados ficam armazenados por 30 dias após o cancelamento. Você pode exportar suas receitas em PDF antes disso. Após 30 dias, os dados são deletados permanentemente." },
          ].map((f) => (
            <div key={f.q} className="faq-item reveal" onClick={toggleFaq}>
              <div className="faq-q">{f.q} <span className="icon">+</span></div>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section-cta-final">
        <p className="section-eyebrow">Sua confeitaria merece</p>
        <h2>Comece hoje.<br /><em>Cobre o preço certo</em> amanhã.</h2>
        <p className="cta-subtitle">7 dias grátis. Sem cartão. Sem complicação. Só você e o seu lucro real.</p>
        <div className="cta-buttons">
          <Link to="/auth" className="btn-cta-white">🎂 Criar minha conta grátis</Link>
          <a href="#funcionalidades" className="btn-cta-ghost">Ver todas as funcionalidades</a>
        </div>
        <p className="cta-note">Já são +1.200 confeiteiros. Junte-se a eles hoje.</p>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div>
          <div className="footer-brand-name">
            <img src={logo} alt="Fatia do Lucro" className="nav-logo-img" />
            Fatia do Lucro
          </div>
          <p className="footer-desc">O sistema de gestão feito especialmente para confeiteiros autônomos e pequenas doceiras. Calcule custos, controle o financeiro e cresça com dados reais.</p>
        </div>
        <div className="footer-col">
          <h4>Produto</h4>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#planos">Planos e Preços</a>
          <a href="#como-funciona">Como funciona</a>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
        </div>
        <div className="footer-col">
          <h4>Contato</h4>
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Fatia do Lucro. Todos os direitos reservados.</span>
        <span>Feito com 🍰 para confeiteiros brasileiros</span>
      </div>
    </div>
  );
};

export default Index;
