import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  Package,
  BarChart3,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Scale,
  MessageCircle,
  LogIn,
  UserPlus,
  X,
  Gift,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#3B2A1A] overflow-x-hidden">
      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 bg-[#FFF9F0]/90 backdrop-blur-xl border-b border-[#E8D5C0]">
        <div className="container mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Fatia do Lucro" className="w-11 h-11 rounded-xl shadow-md object-cover" />
            <span className="text-lg font-bold tracking-tight">Fatia do Lucro</span>
          </div>
          <Link to="/auth">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 font-semibold"
            >
              <LogIn className="w-4 h-4 mr-1.5" />
              Entrar
            </Button>
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-12 pb-14 md:pt-20 md:pb-24 px-5">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-transparent to-transparent pointer-events-none" />
        <div className="relative container mx-auto max-w-2xl text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-5">
              <Gift className="w-3.5 h-3.5" />
              7 dias de acesso total grátis
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-3xl md:text-5xl font-extrabold leading-[1.15] tracking-tight"
          >
            Saiba exatamente{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
              quanto cobrar
            </span>{" "}
            por cada doce.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-5 text-base md:text-lg text-[#6B5744] leading-relaxed max-w-xl mx-auto"
          >
            Controle ingredientes, calcule custos, defina preços e gerencie
            encomendas — tudo num só lugar, feito para confeiteiros.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="mt-8"
          >
            <Link to="/auth">
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-base font-bold shadow-xl shadow-emerald-500/25 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
              >
                Experimentar Grátis por 7 Dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-[#9A8672]">
              Sem cartão de crédito. Sem compromisso.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== PREÇO BLINDADO ===== */}
      <section className="py-14 md:py-20 px-5 bg-gradient-to-b from-[#FFF9F0] to-[#F5EDE3]">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mb-4">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold">Preço Blindado</h2>
            <p className="mt-3 text-[#6B5744] max-w-md mx-auto">
              Nossa inteligência calcula o preço exato para você nunca mais pagar
              a taxa do delivery do seu próprio bolso.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
            className="bg-white rounded-3xl shadow-lg shadow-[#3B2A1A]/5 border border-[#E8D5C0] p-6 md:p-8"
          >
            <p className="text-center text-sm font-semibold text-[#9A8672] mb-5">
              Se você quer lucrar <span className="text-emerald-600 font-bold">R$ 30,00</span> líquidos:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Balcão</p>
                <p className="text-3xl md:text-4xl font-extrabold text-emerald-600">
                  R$ 30<span className="text-lg">,00</span>
                </p>
                <p className="text-xs text-emerald-600/70 mt-1">Taxa: 0%</p>
              </div>
              <div className="rounded-2xl bg-red-50 border border-red-200 p-5 text-center">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">iFood</p>
                <p className="text-3xl md:text-4xl font-extrabold text-red-500">
                  R$ 44<span className="text-lg">,11</span>
                </p>
                <p className="text-xs text-red-500/70 mt-1">Taxa: ~27,5%</p>
              </div>
            </div>
            <p className="text-center text-xs text-[#9A8672] mt-5">
              O app calcula o preço automaticamente para cada plataforma 🛡️
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== FUNCIONALIDADES ===== */}
      <section className="py-14 md:py-20 px-5">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-extrabold">O que você pode fazer</h2>
            <p className="mt-3 text-[#6B5744] text-sm max-w-md mx-auto">
              Todas as ferramentas que um confeiteiro precisa, reunidas num app simples e bonito.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "📖",
                title: "Receitas Inteligentes",
                desc: "Chega de dúvida. Calcule o custo exato de cada brigadeiro ou fatia de bolo automaticamente enquanto digita.",
                badge: null,
              },
              {
                icon: "🛡️",
                title: "Preço Blindado",
                desc: "Pare de pagar as taxas do iFood do seu bolso. Nossa inteligência calcula o preço certo para você lucrar em qualquer plataforma.",
                badge: "MAIS USADO",
              },
              {
                icon: "🛒",
                title: "Estoque sob Controle",
                desc: "Nunca mais perca uma venda por falta de insumo. Saiba exatamente o que tem no armário e o valor do seu estoque.",
                badge: null,
              },
              {
                icon: "📅",
                title: "Gestão de Encomendas",
                desc: "Sua agenda organizada. Controle prazos, status de produção e entregas sem usar papel ou planilhas.",
                badge: null,
              },
              {
                icon: "💰",
                title: "Financeiro Profissional",
                desc: "Onde foi parar o dinheiro? Visualize seu lucro real, despesas e metas em um painel simples e poderoso.",
                badge: null,
              },
              {
                icon: "🔗",
                title: "Catálogo Digital",
                desc: "Transforme seu WhatsApp em uma máquina de vendas com um cardápio online profissional e elegante.",
                badge: null,
              },
              {
                icon: "📝",
                title: "Lista de Compras Automática",
                desc: "Economize tempo no mercado. O app gera sua lista baseada no que você precisa produzir no dia.",
                badge: null,
              },
              {
                icon: "🧮",
                title: "Simuladores de Margem",
                desc: "Quer dar desconto ou mudar o preço? Simule o impacto no seu lucro antes de tomar a decisão.",
                badge: null,
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={fadeUp}
                custom={i % 2}
                className="relative bg-white rounded-2xl border border-[#E8D5C0] p-5 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 transition-shadow duration-300"
              >
                {feat.badge && (
                  <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md">
                    {feat.badge}
                  </span>
                )}
                <span className="text-2xl">{feat.icon}</span>
                <h3 className="font-bold text-sm mt-2.5">{feat.title}</h3>
                <p className="text-xs text-[#6B5744] leading-relaxed mt-1.5">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARATIVO DE PLANOS ===== */}
      <section className="py-14 md:py-20 px-5 bg-gradient-to-b from-[#F5EDE3] to-[#FFF9F0]">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-extrabold">Compare os Planos</h2>
            <p className="mt-3 text-[#6B5744] text-sm">
              Comece grátis e evolua quando estiver pronto.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
            className="grid md:grid-cols-2 gap-5"
          >
            {/* Plano Grátis */}
            <div className="bg-white rounded-3xl border border-[#E8D5C0] p-6 md:p-8">
              <p className="text-sm text-[#9A8672] font-semibold">Plano Grátis</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#3B2A1A]">R$ 0</span>
                <span className="text-sm text-[#9A8672]">/mês</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                + 7 dias de acesso PRO total
              </p>

              <ul className="mt-6 space-y-2.5 text-left">
                {[
                  { text: "Até 5 receitas", included: true },
                  { text: "Até 15 ingredientes", included: true },
                  { text: "Até 10 clientes", included: true },
                  { text: "Até 10 encomendas", included: true },
                  { text: "Catálogo Digital", included: false },
                  { text: "Simuladores de Preço", included: false },
                  { text: "Financeiro Completo", included: false },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2.5 text-sm">
                    {item.included ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-[#C4B5A3] shrink-0" />
                    )}
                    <span className={item.included ? "text-[#3B2A1A]" : "text-[#B0A090]"}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link to="/auth" className="block mt-6">
                <Button
                  variant="outline"
                  className="w-full rounded-full py-5 font-semibold border-[#E8D5C0] text-[#6B5744] hover:bg-[#F5EDE3]"
                >
                  Criar Conta Grátis
                </Button>
              </Link>
            </div>

            {/* Plano PRO */}
            <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-xl shadow-emerald-500/10 p-6 md:p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                RECOMENDADO
              </div>

              <p className="text-sm text-[#9A8672] font-semibold mt-1">Plano PRO</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-emerald-600">R$ 19</span>
                <span className="text-xl font-bold text-emerald-600">,90</span>
                <span className="text-sm text-[#9A8672]">/mês</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-left">
                {[
                  "Receitas ilimitadas",
                  "Ingredientes ilimitados",
                  "Clientes ilimitados",
                  "Encomendas ilimitadas",
                  "Catálogo Digital",
                  "Simuladores de Preço (Preço Blindado)",
                  "Financeiro Completo",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#3B2A1A]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/auth" className="block mt-6">
                <Button className="w-full rounded-full py-5 text-base font-bold shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
                  Começar Agora
                  <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
              </Link>

              <p className="mt-3 text-xs text-center text-[#9A8672]">
                Sem fidelidade. Cancele quando quiser.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#3B2A1A] text-[#D4C4B0] py-10 px-5">
        <div className="container mx-auto max-w-2xl">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Fatia do Lucro" className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-bold text-white">Fatia do Lucro</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/auth" className="hover:text-white transition-colors flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5" /> Login
              </Link>
              <Link to="/auth" className="hover:text-white transition-colors flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Cadastro
              </Link>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Suporte
              </a>
            </div>

            <div className="flex gap-4 text-xs">
              <Link to="/privacidade" className="hover:text-white transition-colors">
                Privacidade
              </Link>
              <Link to="/termos" className="hover:text-white transition-colors">
                Termos
              </Link>
            </div>

            <p className="text-xs text-[#9A8672]">
              © {new Date().getFullYear()} Fatia do Lucro. Feito com 💖 para confeiteiros.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
