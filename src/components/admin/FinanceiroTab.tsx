import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Eye, EyeOff, Save, TestTube, Loader2 } from "lucide-react";

interface FinanceiroTabProps {
  mpPublicKey: string;
  setMpPublicKey: (v: string) => void;
  mpAccessToken: string;
  setMpAccessToken: (v: string) => void;
  showToken: boolean;
  setShowToken: (v: boolean) => void;
  loading: boolean;
  saving: boolean;
  configId: string | null;
  setConfigId: (v: string | null) => void;
  setLoading: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  toast: (opts: any) => void;
}

export const FinanceiroTab = ({
  mpPublicKey, setMpPublicKey,
  mpAccessToken, setMpAccessToken,
  showToken, setShowToken,
  loading, saving,
  configId, setConfigId,
  setLoading, setSaving,
  toast,
}: FinanceiroTabProps) => {
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!fetched) {
      fetchConfig();
      setFetched(true);
    }
  }, [fetched]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_config" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const row = data as any;
        setConfigId(row.id);
        setMpPublicKey(row.mp_public_key || "");
        setMpAccessToken(row.mp_access_token || "");
      }
    } catch (error) {
      console.error("Error fetching app_config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!configId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_config" as any)
        .update({
          mp_public_key: mpPublicKey || null,
          mp_access_token: mpAccessToken || null,
        } as any)
        .eq("id", configId);
      if (error) throw error;
      toast({ title: "Credenciais salvas com sucesso!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ variant: "destructive", title: "Sessão expirada. Faça login novamente." });
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-mercadopago`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        toast({ title: `Conexão Aprovada! Integrado com ${result.account_name}` });
      } else {
        toast({ variant: "destructive", title: result.error || "Falha na conexão. Verifique se o Access Token está correto." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao testar conexão", description: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Mercado Pago
          </CardTitle>
          <CardDescription>
            Configure as credenciais do Mercado Pago para processar pagamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mp_public_key">Public Key</Label>
            <Input
              id="mp_public_key"
              value={mpPublicKey}
              onChange={(e) => setMpPublicKey(e.target.value)}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mp_access_token">Access Token</Label>
            <div className="relative">
              <Input
                id="mp_access_token"
                type={showToken ? "text" : "password"}
                value={mpAccessToken}
                onChange={(e) => setMpAccessToken(e.target.value)}
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
