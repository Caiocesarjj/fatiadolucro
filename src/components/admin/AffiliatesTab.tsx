import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { useToast } from "@/hooks/use-toast";
import { validateReferralCode } from "@/lib/referralValidation";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";

interface Affiliate {
  user_id: string;
  store_name: string | null;
  referral_code: string;
  referral_count: number;
}

interface SearchResult {
  id: string;
  user_id: string;
  store_name: string | null;
  referral_code: string | null;
}

export const AffiliatesTab = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      // Get all users with referral_code
      const { data: affiliateProfiles, error } = await supabase
        .from("profiles")
        .select("user_id, store_name, referral_code")
        .not("referral_code", "is", null);

      if (error) throw error;

      // Count referrals for each affiliate
      const affiliatesWithCount: Affiliate[] = [];
      for (const profile of affiliateProfiles || []) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", profile.user_id);

        affiliatesWithCount.push({
          user_id: profile.user_id,
          store_name: profile.store_name,
          referral_code: profile.referral_code!,
          referral_count: count || 0,
        });
      }

      setAffiliates(affiliatesWithCount);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching affiliates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, store_name, referral_code")
        .ilike("store_name", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSetReferralCode = async () => {
    if (!selectedUser || !newCode.trim()) {
      toast({ variant: "destructive", title: "Selecione um usuário e defina um código." });
      return;
    }
    const validation = validateReferralCode(newCode);
    if (!validation.valid) {
      toast({ variant: "destructive", title: (validation as { valid: false; error: string }).error });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ referral_code: validation.code } as any)
        .eq("user_id", selectedUser.user_id);

      if (error) throw error;

      toast({ title: `Código "${newCode.trim().toUpperCase()}" atribuído com sucesso!` });
      setSelectedUser(null);
      setNewCode("");
      setSearchQuery("");
      setSearchResults([]);
      fetchAffiliates();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add affiliate */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Cadastrar Afiliado
            </CardTitle>
            <CardDescription>Busque um usuário e defina um código de indicação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome da confeitaria..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching} variant="outline">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setNewCode(user.referral_code || ""); }}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedUser?.id === user.id ? "bg-primary/10" : ""}`}
                  >
                    <p className="font-medium">{user.store_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                    {user.referral_code && (
                      <Badge variant="outline" className="mt-1 text-xs">Código: {user.referral_code}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <p className="text-sm font-medium">
                  Selecionado: <span className="text-primary">{selectedUser.store_name || "Sem nome"}</span>
                </p>
                <div className="space-y-2">
                  <Label>Código de Indicação</Label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="Ex: MARIA10"
                    className="font-mono uppercase"
                    maxLength={20}
                  />
                </div>
                <Button onClick={handleSetReferralCode} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Código
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Affiliates list */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Afiliados Cadastrados
            </CardTitle>
            <CardDescription>Lista de todos os afiliados e suas indicações</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : affiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhum afiliado cadastrado ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Confeitaria</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Indicações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((affiliate) => (
                      <TableRow key={affiliate.user_id}>
                        <TableCell className="font-medium">{affiliate.store_name || "Sem nome"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{affiliate.referral_code}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{affiliate.referral_count}</TableCell>
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
