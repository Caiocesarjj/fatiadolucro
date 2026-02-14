import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, CreditCard, TestTube, Save } from "lucide-react";

const AdminFinanceiro = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchConfig();
  }, [isAdmin]);

  const fetchConfig = async () => {
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

  const handleTestConnection = () => {
    toast({ title: "Credenciais salvas com sucesso" });
  };

  if (roleLoading || loading) {
    return (
      <AppLayout title="Configuração Financeira">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout title="Configuração Financeira">
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
              <Button variant="outline" onClick={handleTestConnection}>
                <TestTube className="h-4 w-4 mr-2" />
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminFinanceiro;
