import React from 'react';
import type { ToolType, FontHandwriting, ShapeKind } from '../types/notebook';
import { 
  Type, 
  PenTool, 
  Pencil, 
  Highlighter, 
  Eraser, 
  Sparkles,
  Minus,
  Plus,
  Image as ImageIcon,
  Shapes,
  Square,
  Circle,
  Triangle,
  ArrowUpRight,
  PaintBucket,
  X
} from 'lucide-react';

interface StationeryBarProps {
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  fontFamily: FontHandwriting;
  onChangeTool: (tool: ToolType) => void;
  onChangeColor: (color: string) => void;
  onChangeFont: (font: FontHandwriting) => void;
  onChangeBrushSize: (size: number) => void;
  onPasteImage?: (dataUrl: string) => void;
  fontScale?: number;
  onChangeFontScale?: (scale: number) => void;
  shapeKind?: ShapeKind;
  shapeFill?: boolean;
  onChangeShapeKind?: (kind: ShapeKind) => void;
  onChangeShapeFill?: (fill: boolean) => void;
  onClose?: () => void;
}

export const StationeryBar: React.FC<StationeryBarProps> = ({
  activeTool,
  brushColor,
  brushSize,
  fontFamily,
  onChangeTool,
  onChangeColor,
  onChangeFont,
  onChangeBrushSize,
  onPasteImage,
  fontScale: _fontScale = 1,
  onChangeFontScale: _onChangeFontScale,
  shapeKind = 'rect',
  shapeFill = false,
  onChangeShapeKind,
  onChangeShapeFill,
  onClose,
}) => {
  const COLORS = [
    { label: 'Preto', color: '#18181b' },
    { label: 'Branco (Dark Mode)', color: '#ffffff' },
    { label: 'Azul', color: '#2563eb' },
    { label: 'Vermelho', color: '#dc2626' },
    { label: 'Verde', color: '#16a34a' },
    { label: 'Amarelo Marca-Texto', color: '#fef08a' },
  ];

  const FONTS: { id: FontHandwriting; name: string }[] = [
    { id: 'Caveat', name: 'Caveat' },
    { id: 'Patrick Hand', name: 'Patrick Hand' },
    { id: 'Indie Flower', name: 'Indie' },
    { id: 'Kalam', name: 'Kalam' },
    { id: 'Lora', name: 'Lora' },
  ];

  const SIZES = [
    { label: 'Fino (2px) - Atalho: [', size: 2, dotSize: 3 },
    { label: 'Médio (4px)', size: 4, dotSize: 6 },
    { label: 'Grosso (7px)', size: 7, dotSize: 9 },
    { label: 'Largo (12px) - Atalho: ]', size: 12, dotSize: 12 },
  ];

  const handleStepSize = (delta: number) => {
    const next = Math.max(1, Math.min(24, brushSize + delta));
    onChangeBrushSize(next);
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          if (onPasteImage) onPasteImage(dataUrl);
          window.dispatchEvent(new CustomEvent('insert-notebook-image', { detail: dataUrl }));
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageButtonClick = async () => {
    // 1. Try reading directly from clipboard via Electron
    if (window.electronAPI?.readClipboardImage) {
      try {
        const nativeImg = await window.electronAPI.readClipboardImage();
        if (nativeImg) {
          if (onPasteImage) onPasteImage(nativeImg);
          window.dispatchEvent(new CustomEvent('insert-notebook-image', { detail: nativeImg }));
          return;
        }
      } catch {
        // fallback
      }
    }

    // 2. Try browser clipboard API
    if (navigator.clipboard?.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (evt) => {
              const dataUrl = evt.target?.result as string;
              if (dataUrl) {
                if (onPasteImage) onPasteImage(dataUrl);
                window.dispatchEvent(new CustomEvent('insert-notebook-image', { detail: dataUrl }));
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      } catch {
        // fallback to file selector
      }
    }

    // 3. Fallback: open file picker to choose an image from PC
    fileInputRef.current?.click();
  };

  return (
    <div className="floating-stationery-dock">
      {/* Hidden file input fallback for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Tool Selector with Keyboard Shortcuts */}
      <div className="dock-group">
        <button
          onClick={() => onChangeTool('type')}
          title="Modo Texto (Atalho: T) - Digitar nas linhas"
          className={`dock-btn ${activeTool === 'type' ? 'active' : ''}`}
        >
          <Type size={14} />
          <span>Texto</span>
          <span className="tool-kbd-shortcut">T</span>
        </button>

        <button
          onClick={() => onChangeTool('pen')}
          title="Caneta Esferográfica (Atalho: P)"
          className={`dock-btn ${activeTool === 'pen' ? 'active' : ''}`}
        >
          <PenTool size={14} />
          <span className="tool-kbd-shortcut">P</span>
        </button>

        <button
          onClick={() => onChangeTool('pencil')}
          title="Lápis Grafite (Atalho: L ou B)"
          className={`dock-btn ${activeTool === 'pencil' ? 'active' : ''}`}
        >
          <Pencil size={14} />
          <span className="tool-kbd-shortcut">L</span>
        </button>

        <button
          onClick={() => {
            onChangeTool('highlighter');
            if (brushColor !== '#fef08a') {
              onChangeColor('#fef08a');
            }
          }}
          title="Marca-texto Fluorescente (Atalho: H)"
          className={`dock-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
        >
          <Highlighter size={14} />
          <span className="tool-kbd-shortcut">H</span>
        </button>

        <button
          onClick={() => onChangeTool('eraser')}
          title="Borracha (Atalho: E)"
          className={`dock-btn ${activeTool === 'eraser' ? 'active' : ''}`}
        >
          <Eraser size={14} />
          <span className="tool-kbd-shortcut">E</span>
        </button>

        <button
          onClick={() => onChangeTool('shape')}
          title="Formas geométricas (Atalho: S)"
          className={`dock-btn ${activeTool === 'shape' ? 'active' : ''}`}
        >
          <Shapes size={14} />
          <span className="tool-kbd-shortcut">S</span>
        </button>

        {/* Paste Image Button */}
        <button
          onClick={handleImageButtonClick}
          title="Colar Imagem (Atalho: Ctrl+V) - Cole prints de tela ou selecione foto"
          className="dock-btn"
        >
          <ImageIcon size={14} />
          <span>Foto</span>
          <span className="tool-kbd-shortcut">Ctrl+V</span>
        </button>
      </div>

      {/* Shape picker: kind + filled/outline (only with the shape tool) */}
      {activeTool === 'shape' && (
        <div className="brush-size-group" title="Tipo de forma">
          {([
            { kind: 'rect', label: 'Retângulo', icon: <Square size={13} /> },
            { kind: 'ellipse', label: 'Círculo / Elipse', icon: <Circle size={13} /> },
            { kind: 'triangle', label: 'Triângulo', icon: <Triangle size={13} /> },
            { kind: 'line', label: 'Linha reta', icon: <Minus size={13} /> },
            { kind: 'arrow', label: 'Seta', icon: <ArrowUpRight size={13} /> },
          ] as { kind: ShapeKind; label: string; icon: React.ReactNode }[]).map((s) => (
            <button
              key={s.kind}
              onClick={() => onChangeShapeKind?.(s.kind)}
              title={s.label}
              className={`brush-size-btn ${shapeKind === s.kind ? 'active' : ''}`}
              style={{ color: '#fff' }}
            >
              {s.icon}
            </button>
          ))}
          <button
            onClick={() => onChangeShapeFill?.(!shapeFill)}
            title={shapeFill ? 'Preenchida (clique para só contorno)' : 'Só contorno (clique para preencher com a cor)'}
            className={`brush-size-btn ${shapeFill ? 'active' : ''}`}
            style={{ color: '#fff' }}
          >
            <PaintBucket size={13} />
          </button>
        </div>
      )}

      {/* Brush Size Selector (Only for drawing tools, ultra compact) */}
      {activeTool !== 'type' && (
        <div className="brush-size-group" title={`Espessura do traço: ${brushSize}px (Atalhos: [ e ])`}>
          <button
            onClick={() => handleStepSize(-1)}
            disabled={brushSize <= 1}
            className="brush-size-btn"
            title="Diminuir espessura (Atalho: [)"
          >
            <Minus size={11} />
          </button>

          {SIZES.map((s) => (
            <button
              key={s.size}
              onClick={() => onChangeBrushSize(s.size)}
              title={s.label}
              className={`brush-size-btn ${brushSize === s.size ? 'active' : ''}`}
            >
              <div
                className="brush-dot-preview"
                style={{
                  width: `${s.dotSize}px`,
                  height: `${s.dotSize}px`,
                  backgroundColor: brushColor === '#ffffff' ? '#ffffff' : brushColor,
                }}
              />
            </button>
          ))}

          <button
            onClick={() => handleStepSize(1)}
            disabled={brushSize >= 24}
            className="brush-size-btn"
            title="Aumentar espessura (Atalho: ])"
          >
            <Plus size={11} />
          </button>
        </div>
      )}

      {/* Color Swatches */}
      {activeTool !== 'eraser' && (
        <div className="dock-group">
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {COLORS.map(({ label, color }) => (
              <div
                key={color}
                onClick={() => onChangeColor(color)}
                title={label}
                className={`swatch-item ${brushColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font Family Selector (Shown for text tool or anytime) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Sparkles size={13} style={{ color: '#f59e0b', opacity: 0.8 }} />
        <select
          value={fontFamily}
          onChange={(e) => onChangeFont(e.target.value as FontHandwriting)}
          title="Fonte da Escrita"
          className="dock-select"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id} style={{ background: '#1c1f24', color: '#fff' }}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="brush-size-group" title="Tamanho da letra: Selecione o texto e clique em A- ou A+ para alterar pontualmente">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('adjust-notebook-font-size', { detail: { delta: -0.25 } }));
            }}
            className="brush-size-btn"
            title="Diminuir fonte (Selecione o texto ou altere para digitar menor)"
            style={{ color: '#fff', fontSize: '0.62rem', fontWeight: 700 }}
          >
            A-
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('adjust-notebook-font-size', { detail: { delta: 0.25 } }));
            }}
            className="brush-size-btn"
            title="Aumentar fonte (Selecione o texto ou altere para digitar maior)"
            style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}
          >
            A+
          </button>
        </div>
      </div>

      {/* Optional Close Button to hide the dock */}
      {onClose && (
        <button
          onClick={onClose}
          className="dock-btn"
          title="Ocultar barra de ferramentas (Clique na Paleta 🎨 no topo para reabrir)"
          style={{ padding: '0.35rem 0.45rem', opacity: 0.6, marginLeft: '2px' }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
