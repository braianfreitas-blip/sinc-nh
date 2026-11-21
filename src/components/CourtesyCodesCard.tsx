import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Gift, Loader2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateCourtesyCode } from '@/lib/registration';

// Configurações → Cortesias. Cada código cobre N pessoas (ex.: 4 = família de 4).
// A pessoa digita o código na inscrição e não paga. Entregue o código no privado.
interface Code {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  note: string;
  active: boolean;
}

export default function CourtesyCodesCard({ eventId }: { eventId: string }) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [indisponivel, setIndisponivel] = useState(false);
  const [novo, setNovo] = useState({ code: generateCourtesyCode(), maxUses: 1, note: '' });
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('courtesy_codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) setIndisponivel(true);
    else setCodes((data || []) as Code[]);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const criar = async () => {
    const code = novo.code.trim().toUpperCase();
    if (!code) { toast.error('Informe o código.'); return; }
    if (!(novo.maxUses >= 1)) { toast.error('Quantidade de pessoas inválida.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('courtesy_codes').insert({
      event_id: eventId,
      code,
      max_uses: Math.floor(novo.maxUses),
      note: novo.note.trim(),
    });
    setSalvando(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Esse código já existe neste evento.' : 'Não foi possível criar o código.');
      return;
    }
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success(`Código ${code} criado e copiado!`);
    setNovo({ code: generateCourtesyCode(), maxUses: 1, note: '' });
    load();
  };

  const alternar = async (c: Code) => {
    const { error } = await supabase.from('courtesy_codes').update({ active: !c.active }).eq('id', c.id);
    if (error) { toast.error('Não foi possível atualizar.'); return; }
    load();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Gift className="w-5 h-5" />Cortesias</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Para quem não tem condição de pagar. Crie um código, entregue no privado, e a pessoa digita na inscrição.
          Cada código vale para o número de pessoas que você escolher. Também dá para marcar alguém como <b>Isento / Cortesia</b> direto na lista de convidados.
        </p>
      </div>

      {indisponivel ? (
        <p className="text-sm text-warning">As cortesias ainda não estão ativas no banco. Rode o SQL <code>0002_group_registration_pix_courtesy.sql</code> no Lovable Cloud.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
            <div>
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input value={novo.code} onChange={e => setNovo(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))} />
                <Button type="button" variant="outline" size="icon" onClick={() => setNovo(p => ({ ...p, code: generateCourtesyCode() }))} title="Gerar outro">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div><Label>Pessoas</Label><Input type="number" min={1} value={novo.maxUses} onChange={e => setNovo(p => ({ ...p, maxUses: Number(e.target.value) }))} /></div>
          </div>
          <div><Label>Para quem (só a equipe vê)</Label><Input value={novo.note} onChange={e => setNovo(p => ({ ...p, note: e.target.value }))} placeholder="Ex.: Família Souza" /></div>
          <Button type="button" onClick={criar} disabled={salvando}>
            {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Criar código
          </Button>

          {loading ? null : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum código criado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {codes.map(c => (
                <li key={c.id} className={`flex items-center justify-between gap-3 px-3 py-2 ${c.active ? '' : 'opacity-50'}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium">{c.code}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.used_count}/{c.max_uses} {c.max_uses === 1 ? 'pessoa' : 'pessoas'}{c.note ? ` · ${c.note}` : ''}{!c.active ? ' · desativado' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="ghost" size="icon" title="Copiar" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Código copiado!'); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => alternar(c)}>{c.active ? 'Desativar' : 'Reativar'}</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
