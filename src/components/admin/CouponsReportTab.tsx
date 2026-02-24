import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, BarChart3, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";

interface CouponReport {
  id: string;
  code: string;
  type: "percentage" | "vip_access";
  value: number;
  usage_count: number;
  is_active: boolean;
  valid_until: string | null;
}

interface AffiliateReport {
  user_id: string;
  referral_code: string;
  full_name: string | null;
  store_name: string | null;
  referral_count: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const CouponsReportTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<CouponReport[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(now);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from("coupons")
        .select("id, code, type, value, usage_count, is_active, valid_until")
        .order("usage_count", { ascending: false });

      if (couponsError) throw couponsError;
      setCoupons((couponsData as CouponReport[]) || []);

      // Fetch affiliates (profiles with referral_code set)
      const { data: affData, error: affError } = await supabase
        .from("profiles")
        .select("user_id, referral_code, full_name, store_name")
        .not("referral_code", "is", null);

      if (affError) throw affError;

      // Count referrals per affiliate
      const affiliatesWithCount = await Promise.all(
        (affData || []).map(async (aff: any) => {
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("referred_by", aff.user_id);

          return {
            user_id: aff.user_id,
            referral_code: aff.referral_code,
            full_name: aff.full_name,
            store_name: aff.store_name,
            referral_count: count || 0,
          };
        })
      );

      setAffiliates(affiliatesWithCount.sort((a, b) => b.referral_count - a.referral_count));
    } catch (err: any) {
      console.error("Report error:", err);
      if (err?.message?.includes("relation") || err?.code === "42P01") {
        setError("A tabela necessária não existe no banco de dados. Verifique o schema.");
      } else {
        setError(mapErrorToUserMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-6">
      {/* Date Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Data Inicial</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Data Final</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={fetchReport} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar relatório</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Coupons Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Cupons
            </CardTitle>
            <CardDescription>Uso e valores dos cupons cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum cupom encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Valor</TableHead>
                      <TableHead className="text-center">Usos</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                        <TableCell>{c.type === "percentage" ? "Desconto %" : "Acesso VIP"}</TableCell>
                        <TableCell className="text-center">
                          {c.type === "percentage" ? `${c.value}%` : "—"}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{c.usage_count}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", c.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                            {c.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Affiliates Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Afiliados
            </CardTitle>
            <CardDescription>Códigos de indicação e conversões</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : affiliates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum afiliado encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / Confeitaria</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Indicações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((a) => (
                      <TableRow key={a.user_id}>
                        <TableCell>{a.store_name || a.full_name || "—"}</TableCell>
                        <TableCell className="font-mono font-semibold">{a.referral_code}</TableCell>
                        <TableCell className="text-center font-semibold text-success">{a.referral_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
