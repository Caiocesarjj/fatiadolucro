import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calculator, DollarSign, Clock, Save, Info } from "lucide-react";
import { motion } from "framer-motion";

const Precificacao = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [fixedCosts, setFixedCosts] = useState("");
  const [salaryGoal, setSalaryGoal] = useState("");
  const [workHoursPerDay, setWorkHoursPerDay] = useState("8");
  const [workDaysPerMonth, setWorkDaysPerMonth] = useState("22");

  // Calculations
  const totalMonthlyGoal = (parseFloat(fixedCosts.replace(",", ".")) || 0) + (parseFloat(salaryGoal.replace(",", ".")) || 0);
  const hoursPerMonth = (parseFloat(workHoursPerDay) || 8) * (parseFloat(workDaysPerMonth) || 22);
  const minutesPerMonth = hoursPerMonth * 60;
  const hourlyRate = hoursPerMonth > 0 ? totalMonthlyGoal / hoursPerMonth : 0;
  const minuteRate = minutesPerMonth > 0 ? totalMonthlyGoal / minutesPerMonth : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <AppLayout title="Precificação">
      <div className="max-w-2xl space-y-6">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/30 bg-primary-light/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-light">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Como funciona?</h3>
                  <p className="text-sm text-muted-foreground">
                    Calcule o valor do seu minuto de trabalho considerando seus custos fixos e sua meta de salário. 
                    Use esse valor para precificar o tempo de preparo das suas receitas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Custo do Seu Minuto
              </CardTitle>
              <CardDescription>
                Preencha os campos para calcular o valor do seu tempo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixedCosts">Custos Fixos Mensais (R$)</Label>
                  <Input
                    id="fixedCosts"
                    value={fixedCosts}
                    onChange={(e) => setFixedCosts(e.target.value)}
                    placeholder="Ex: 500,00"
                    className="input-currency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Aluguel, luz, gás, embalagens fixas, etc.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryGoal">Meta de Salário (R$)</Label>
                  <Input
                    id="salaryGoal"
                    value={salaryGoal}
                    onChange={(e) => setSalaryGoal(e.target.value)}
                    placeholder="Ex: 3000,00"
                    className="input-currency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quanto você quer tirar de lucro por mês
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workHours">Horas de Trabalho por Dia</Label>
                  <Input
                    id="workHours"
                    type="number"
                    value={workHoursPerDay}
                    onChange={(e) => setWorkHoursPerDay(e.target.value)}
                    placeholder="8"
                    className="input-currency"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workDays">Dias de Trabalho por Mês</Label>
                  <Input
                    id="workDays"
                    type="number"
                    value={workDaysPerMonth}
                    onChange={(e) => setWorkDaysPerMonth(e.target.value)}
                    placeholder="22"
                    className="input-currency"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Resultados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Meta Mensal Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalMonthlyGoal)}
                  </p>
                </div>
                <div className="p-4 bg-primary-light rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Valor por Hora</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(hourlyRate)}
                  </p>
                </div>
                <div className="p-4 bg-success-light rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Valor por Minuto</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(minuteRate)}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Como usar na Calculadora:</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ao criar uma receita, adicione o tempo de preparo em minutos. 
                  Multiplique pelo valor do minuto ({formatCurrency(minuteRate)}) para obter o custo de mão de obra.
                </p>
                <div className="mt-3 p-3 bg-muted/30 rounded text-sm">
                  <strong>Exemplo:</strong> Receita com 30 minutos de preparo = 30 × {formatCurrency(minuteRate)} = {formatCurrency(minuteRate * 30)} de mão de obra
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Precificacao;
