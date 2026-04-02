import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedGuest {
  firstName: string;
  lastName: string;
  valid: boolean;
  duplicate: boolean;
  selected: boolean;
}

export default function WhatsAppImportPage() {
  const { event, addGuest } = useEvent();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedGuest[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  const handleParse = () => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const results: ParsedGuest[] = lines.map(line => {
      // Remove numbering, emojis, special chars from start
      const cleaned = line.replace(/^[\d\.\-\)\s]+/, '').replace(/[^\p{L}\s]/gu, '').trim();
      const parts = cleaned.split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const valid = firstName.length > 0 && lastName.length > 0;
      const duplicate = event.guests.some(
        g => g.firstName.toLowerCase() === firstName.toLowerCase() &&
             g.lastName.toLowerCase() === lastName.toLowerCase()
      );
      return { firstName, lastName, valid, duplicate, selected: valid && !duplicate };
    });
    setParsed(results);
    setStep('review');
  };

  const handleImport = () => {
    const toImport = parsed.filter(p => p.selected && p.valid);
    toImport.forEach(p => {
      addGuest({
        firstName: p.firstName,
        lastName: p.lastName,
        presenceStatus: 'pending',
        paymentStatus: event.isPaid ? 'pending' : 'not_applicable',
        amountDue: event.isPaid ? event.ticketPrice : 0,
        amountPaid: 0,
        companions: 0,
        notes: 'Importado do WhatsApp',
        checkedIn: false,
      });
    });
    toast.success(`${toImport.length} convidados importados!`);
    setRawText('');
    setParsed([]);
    setStep('input');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Importar do WhatsApp</h1>
        <p className="text-muted-foreground mt-1">Cole a lista de nomes do grupo do WhatsApp</p>
      </div>

      {step === 'input' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-card">
            <p className="text-sm text-muted-foreground mb-3">
              Cole a lista abaixo. O sistema tentará extrair nome e sobrenome de cada linha.
              Formatos aceitos: "João Silva", "1. João Silva", "- João Silva"
            </p>
            <Textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={"João Silva\nMaria Santos\nPedro Oliveira"}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleParse} disabled={!rawText.trim()} className="w-full sm:w-auto">
            <Upload className="w-4 h-4 mr-2" />Processar Lista
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {parsed.filter(p => p.selected).length} de {parsed.length} selecionados para importação
            </p>
            <Button variant="outline" size="sm" onClick={() => setStep('input')}>Voltar</Button>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 w-10"></th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Sobrenome</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${!p.valid ? 'bg-destructive/5' : p.duplicate ? 'bg-warning/5' : ''}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={p.selected}
                        onCheckedChange={checked => {
                          setParsed(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !!checked } : item));
                        }}
                        disabled={!p.valid}
                      />
                    </td>
                    <td className="p-3 font-medium">{p.firstName || <span className="text-destructive">—</span>}</td>
                    <td className="p-3">{p.lastName || <span className="text-destructive">faltando</span>}</td>
                    <td className="p-3">
                      {!p.valid && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="w-3 h-3" />Incompleto
                        </span>
                      )}
                      {p.valid && p.duplicate && (
                        <span className="flex items-center gap-1 text-xs text-warning">
                          <AlertTriangle className="w-3 h-3" />Duplicado
                        </span>
                      )}
                      {p.valid && !p.duplicate && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <Check className="w-3 h-3" />OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={handleImport} disabled={parsed.filter(p => p.selected).length === 0} className="w-full sm:w-auto">
            <Check className="w-4 h-4 mr-2" />Importar Selecionados
          </Button>
        </div>
      )}
    </div>
  );
}
