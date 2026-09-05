import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Mail, Trash2, Plus, UserPlus } from "lucide-react";

interface AllowedEmail {
  id: string;
  email: string;
  created_at: string;
}

export default function InvitesPage() {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("id, email, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setEmails(data);
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast({ title: "Email inválido", description: "Digite um email válido.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("allowed_emails").insert({
      email: trimmed,
      invited_by: user?.id,
    });
    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Já convidado", description: "Este email já está na lista.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível adicionar o email.", variant: "destructive" });
      }
    } else {
      toast({ title: "Convite enviado!", description: `${trimmed} agora pode criar uma conta.` });
      setNewEmail("");
      fetchEmails();
    }
  };

  const handleRemove = async (id: string, email: string) => {
    const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" });
    } else {
      toast({ title: "Removido", description: `${email} foi removido da lista.` });
      fetchEmails();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Convites</h1>
        <p className="text-muted-foreground">Gerencie quem pode criar conta no painel administrativo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar novo usuário
          </CardTitle>
          <CardDescription>Digite o email da pessoa que você deseja convidar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? "Adicionando..." : "Convidar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emails autorizados</CardTitle>
          <CardDescription>
            {emails.length === 0
              ? "Nenhum email autorizado ainda."
              : `${emails.length} email(s) autorizado(s)`}
          </CardDescription>
        </CardHeader>
        {emails.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Data do convite</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(item.id, item.email)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
