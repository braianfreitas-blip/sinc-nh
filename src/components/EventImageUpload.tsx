import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  eventId: string;
  kind: 'logo' | 'cover';
  /** Aspect ratio for preview frame */
  aspect?: 'square' | 'video' | 'wide';
  hint?: string;
}

const aspectClass: Record<NonNullable<Props['aspect']>, string> = {
  square: 'aspect-square max-w-[160px]',
  video: 'aspect-video',
  wide: 'aspect-[3/1]',
};

export default function EventImageUpload({ value, onChange, eventId, kind, aspect = 'square', hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${eventId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('event-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('event-assets').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Imagem enviada!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative ${aspectClass[aspect]} w-full rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 hover:bg-background flex items-center justify-center shadow"
              aria-label="Remover imagem"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-muted-foreground text-xs text-center px-3">
            <Upload className="w-6 h-6 mx-auto mb-2 opacity-60" />
            Nenhuma imagem
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleSelect(e.target.files[0])}
      />
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="w-4 h-4 mr-2" />
          {value ? 'Trocar' : 'Enviar imagem'}
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
