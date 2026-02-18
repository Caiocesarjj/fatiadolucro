import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: "recipe_limit" | "module_locked" | "generic_limit";
  moduleName?: string;
  currentCount?: number;
  maxCount?: number;
}

export const UpgradeModal = ({ open, onOpenChange, type = "recipe_limit", moduleName, currentCount, maxCount }: UpgradeModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/planos");
  };

  const getTitle = () => {
    if (type === "module_locked") return `Funcionalidade PRO`;
    if (type === "generic_limit") return `Limite Atingido!`;
    return "Limite de Receitas Atingido!";
  };

  const getDescription = () => {
    if (type === "module_locked") {
      return `O módulo "${moduleName}" é exclusivo para assinantes PRO. Desbloqueie agora!`;
    }
    if (type === "generic_limit") {
      return `Você atingiu o limite de ${currentCount}/${maxCount} ${moduleName} do plano gratuito. Apague um existente ou seja PRO para não ter limites!`;
    }
    return "Você atingiu o limite de receitas do plano Grátis. Faça o upgrade para o plano PRO e crie receitas ilimitadas!";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {type === "module_locked" ? (
              <Lock className="h-8 w-8 text-primary" />
            ) : (
              <Sparkles className="h-8 w-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Crown className="h-4 w-4 mr-2" />
            Seja PRO por apenas R$ 19,90/mês
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Voltar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
