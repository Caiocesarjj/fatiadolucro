import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Settings, Package, CakeSlice, Calculator, ChevronRight, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    icon: Settings,
    title: "Configure sua precificação",
    description:
      "Defina seu salário-meta, dias e horas trabalhados para calcular automaticamente o custo da mão-de-obra nas suas receitas.",
    action: "/configuracoes",
    actionLabel: "Ir para Configurações",
  },
  {
    icon: Package,
    title: "Cadastre seus ingredientes",
    description:
      "Adicione os ingredientes que você usa, com preço e tamanho da embalagem. O sistema calcula o custo por grama/ml/unidade.",
    action: "/ingredientes",
    actionLabel: "Cadastrar Ingredientes",
  },
  {
    icon: CakeSlice,
    title: "Crie sua primeira receita",
    description:
      "Monte a receita com os ingredientes cadastrados. O custo total e o preço sugerido de venda serão calculados na hora!",
    action: "/calculadora",
    actionLabel: "Criar Receita",
  },
];

const ONBOARDING_KEY = "fatia-onboarding-done";

export function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || checked) return;
    setChecked(true);

    // If already dismissed, skip
    if (localStorage.getItem(ONBOARDING_KEY)) return;

    // Check if user is new (no ingredients, no recipes)
    const checkNewUser = async () => {
      const [{ count: ingCount }, { count: recCount }] = await Promise.all([
        supabase.from("ingredients").select("id", { count: "exact", head: true }),
        supabase.from("recipes").select("id", { count: "exact", head: true }),
      ]);

      if ((ingCount ?? 0) === 0 && (recCount ?? 0) === 0) {
        setOpen(true);
      }
    };
    checkNewUser();
  }, [user, checked]);

  const handleAction = () => {
    setOpen(false);
    navigate(STEPS[step].action);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleAction();
    }
  };

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[min(420px,90vw)] p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              Passo {step + 1} de {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 mb-4" />
          <DialogHeader>
            <DialogTitle className="text-xl">{currentStep.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed mt-2">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Icon area */}
        <div className="flex justify-center py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <Icon className="h-10 w-10 text-primary" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 flex flex-col gap-3">
          <Button onClick={handleAction} className="w-full gap-2">
            {currentStep.actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex gap-2">
            {step < STEPS.length - 1 && (
              <Button variant="outline" onClick={handleNext} className="flex-1 gap-1">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" onClick={handleSkip} className="flex-1 text-muted-foreground">
              Pular tutorial
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
