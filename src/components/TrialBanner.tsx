import { Crown, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface TrialBannerProps {
  daysLeft: number;
}

export const TrialBanner = ({ daysLeft }: TrialBannerProps) => {
  const navigate = useNavigate();

  if (daysLeft <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary/10 border border-primary/20 rounded-2xl p-3.5 flex items-center gap-3"
    >
      <div className="p-2 rounded-xl bg-primary/15 shrink-0">
        <Clock className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Acesso total expira em <span className="text-primary font-bold">{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</span>
        </p>
        <p className="text-xs text-muted-foreground">Aproveite todas as funcionalidades PRO!</p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate("/planos")}
        className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-8 text-xs rounded-lg gap-1"
      >
        <Crown className="h-3 w-3" />
        PRO
      </Button>
    </motion.div>
  );
};
