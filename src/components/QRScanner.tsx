import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

interface Props {
  onScan: (decoded: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const containerId = 'qr-scanner-region';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId, { verbose: false });
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: (vw: number, vh: number) => {
        const min = Math.min(vw, vh);
        const size = Math.floor(min * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
    };

    scanner
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onScan(decodedText);
        },
        () => {
          // ignore per-frame decode errors
        }
      )
      .catch((err) => {
        console.error(err);
        setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      });

    return () => {
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-elegant overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />Escanear Ingresso
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative aspect-square bg-black">
          <div id={containerId} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive bg-background/90">
              {error}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground p-4">
          Aponte a câmera para o QR Code do ingresso
        </p>
      </div>
    </div>
  );
}
