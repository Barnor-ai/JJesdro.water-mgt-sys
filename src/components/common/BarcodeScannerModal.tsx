import React, { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, Barcode, CheckCircle, RefreshCw, Download, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { BottleSize } from '../../types/database';
import { useERPStore } from '../../store/useStore';

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanResult,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScanResult?: (code: string, size?: BottleSize) => void;
}) {
  const { bottleTypes, finishedGoods } = useERPStore();
  const [activeTab, setActiveTab] = useState<'scanner' | 'generator'>('scanner');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [selectedBottleSize, setSelectedBottleSize] = useState<BottleSize>('500ml');
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw simple standard Code 128 / QR mockup on canvas
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 320, 160);

        const bottle = bottleTypes.find((b) => b.size === selectedBottleSize);
        const code = bottle?.barcode || '8901234005008';

        // Draw Barcode lines
        ctx.fillStyle = '#0f172a';
        let x = 30;
        for (let i = 0; i < code.length; i++) {
          const digit = parseInt(code[i]) || 3;
          const w = (digit % 3) + 2;
          ctx.fillRect(x, 25, w, 75);
          x += w + ((i % 2) + 2);
        }

        // Fill code text
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`* ${code} *`, 160, 120);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`H2O Pure Bottled Water - ${selectedBottleSize}`, 160, 140);
      }
    }
  }, [selectedBottleSize, activeTab, bottleTypes]);

  const handleSimulateScan = (code: string, size: BottleSize) => {
    setScannedCode(code);
    if (onScanResult) {
      onScanResult(code, size);
    }
  };

  const handleDownloadLabel = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `Barcode_${selectedBottleSize}_Label.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & QR Code Warehouse Scanner"
      description="Scan pallet labels, SKU barcodes, or generate printable thermal stickers"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Toggle Scanner / Generator */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'scanner'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" /> Live Camera / Scanner
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'generator'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Barcode className="w-4 h-4" /> Label Sticker Generator
          </button>
        </div>

        {activeTab === 'scanner' ? (
          <div className="space-y-4">
            {/* Viewfinder UI */}
            <div className="relative aspect-video rounded-2xl bg-slate-950 border-2 border-dashed border-sky-500/50 flex flex-col items-center justify-center overflow-hidden">
              {/* Laser animation bar */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-bounce top-1/3" />

              {/* Viewfinder Corner Brackets */}
              <div className="w-48 h-32 border-2 border-sky-400 rounded-xl relative flex items-center justify-center">
                <div className="text-center p-2 bg-black/60 backdrop-blur-md rounded-lg">
                  <Camera className="w-6 h-6 text-sky-400 mx-auto animate-pulse" />
                  <p className="text-[11px] text-white font-medium mt-1">
                    Align Barcode or QR Code
                  </p>
                </div>
              </div>

              <div className="absolute bottom-3 inset-x-0 text-center">
                <Badge variant="secondary" size="sm">
                  Ready • Auto-Focusing
                </Badge>
              </div>
            </div>

            {/* Quick Test Barcode Clicker */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Simulate Direct Pallet Scan (Select Product SKU):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {bottleTypes.map((bt) => (
                  <button
                    key={bt.id}
                    onClick={() => handleSimulateScan(bt.barcode, bt.size)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-left transition-all hover:bg-sky-50/30 dark:hover:bg-sky-950/20 group"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {bt.size}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {bt.barcode}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {scannedCode && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Successfully Scanned Barcode!
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                      Code: {scannedCode}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="primary" onClick={onClose}>
                  Apply to Stock
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex justify-center items-center gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Select Product Size:
              </label>
              <select
                value={selectedBottleSize}
                onChange={(e) => setSelectedBottleSize(e.target.value as BottleSize)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {bottleTypes.map((bt) => (
                  <option key={bt.id} value={bt.size}>
                    {bt.size} - {bt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generated Barcode Canvas */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex justify-center">
              <canvas
                ref={canvasRef}
                width={320}
                height={160}
                className="rounded-xl shadow-md border border-slate-300 dark:border-slate-700 bg-white"
              />
            </div>

            <div className="flex justify-center gap-3">
              <Button size="sm" variant="outline" onClick={handleDownloadLabel}>
                <Download className="w-4 h-4 mr-1.5" /> Download Sticker (.PNG)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                Print Thermal Label
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
