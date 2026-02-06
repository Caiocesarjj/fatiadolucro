import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, MessageCircle, Crown, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Planos = () => {
  const whatsappNumber = "5511999999999"; // Alterar para o número real
  const whatsappMessage = encodeURIComponent("Olá! Quero fazer o upgrade para o plano PRO do Fatia do Lucro.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const freeBenefits = [
    "Até 3 receitas",
    "Gestão de ingredientes",
    "Calculadora de custos",
    "Lista de compras",
  ];

  const proBenefits = [
    "Receitas ilimitadas",
    "Módulo Financeiro completo",
    "Gestão de Encomendas",
    "Catálogo/Vitrine digital",
    "Relatórios PDF e Excel",
    "CRM de Clientes",
    "Suporte prioritário",
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-light mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Faça o Upgrade!</h1>
          <p className="text-muted-foreground">
            Desbloqueie todos os recursos do Fatia do Lucro
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">Plano Grátis</CardTitle>
                <CardDescription>Para começar a organizar suas receitas</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">R$ 0</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {freeBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full mt-6" asChild>
                  <Link to="/dashboard">Plano Atual</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                RECOMENDADO
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Crown className="h-5 w-5 text-primary" />
                  Plano PRO Mensal
                </CardTitle>
                <CardDescription>Todas as ferramentas para crescer</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-primary">R$ 9,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {proBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-6 bg-primary hover:bg-primary-hover text-primary-foreground"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Falar com Suporte para Assinar
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Annual Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card className="border-success/50 bg-success-light/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <Sparkles className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      Plano PRO Anual
                      <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded-full">
                        ECONOMIA DE 18%
                      </span>
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Pague <span className="font-semibold text-success">R$ 97,00/ano</span> em vez de R$ 118,80
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-success text-success hover:bg-success hover:text-success-foreground"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Assinar Anual
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground underline">
            Voltar ao Dashboard
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Planos;
