import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Cookie,
  Calculator,
  Package,
  Wallet,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: Package,
      title: "Gestão de Ingredientes",
      description:
        "Cadastre seus ingredientes com preços e calcule automaticamente o custo por grama ou unidade.",
    },
    {
      icon: Calculator,
      title: "Calculadora de Receitas",
      description:
        "Monte suas receitas, defina o rendimento e veja o custo unitário de cada produto.",
    },
    {
      icon: Wallet,
      title: "Controle Financeiro",
      description:
        "Registre vendas e despesas, compare lucros entre plataformas de delivery.",
    },
  ];

  const benefits = [
    "Cálculo preciso de custos por unidade",
    "Comparação de lucro entre iFood, 99Food e balcão",
    "Sugestão automática de preço de venda",
    "Desconto automático de taxas de plataforma",
    "Relatórios de receitas vs despesas",
    "100% em Português",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />

        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary">
                <Cookie className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Doce e Lucro</span>
            </div>
            <Link to="/auth">
              <Button variant="outline" className="hover:bg-primary-light">
                Entrar
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 pt-16 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Gestão inteligente para sua{" "}
              <span className="text-gradient-primary">confeitaria</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Calcule custos, precifique seus produtos e acompanhe seus lucros
              de forma simples e precisa. Feito para confeiteiros brasileiros.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-primary-foreground w-full sm:w-auto px-8"
                >
                  Começar Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-foreground">
              Tudo que você precisa
            </h2>
            <p className="mt-4 text-muted-foreground">
              Ferramentas práticas para gerenciar sua confeitaria
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-8 shadow-card hover:shadow-hover transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Por que escolher o Doce e Lucro?
              </h2>
              <p className="text-muted-foreground mb-8">
                Desenvolvido especialmente para confeiteiros que vendem em
                múltiplas plataformas e precisam ter controle total dos seus
                custos e lucros.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-primary-light to-primary/10 rounded-3xl p-8 lg:p-12">
                <div className="bg-card rounded-2xl shadow-lg p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">
                      Custo por Unidade
                    </span>
                    <span className="badge-primary">Brownie</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">R$ 2,35</p>
                </div>
                <div className="bg-card rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">
                      Lucro Líquido (iFood)
                    </span>
                    <span className="badge-success">+45%</span>
                  </div>
                  <p className="text-3xl font-bold text-success">R$ 3,40</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-primary-light to-primary/10">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Pronto para organizar sua confeitaria?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Comece agora mesmo e tenha controle total dos seus custos e
              lucros.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-8"
              >
                Criar Conta Grátis
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-background">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-primary">
                <Cookie className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Doce e Lucro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Doce e Lucro. Feito com 💖 para
              confeiteiros.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
