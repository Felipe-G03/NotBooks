import React, { useState, useEffect, useRef } from 'react';
import type { ToolType, FontHandwriting, ShapeKind } from '../types/notebook';
import { StationeryBar } from './StationeryBar';
import { GripHorizontal, X } from 'lucide-react';

export const ToolsWindowApp: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('type');
  const [brushColor, setBrushColor] = useState<string>('#18181b');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [fontFamily, setFontFamily] = useState<FontHandwriting>('Caveat');
  const [fontScale, setFontScale] = useState<number>(1);
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect');
  const [shapeFill, setShapeFill] = useState<boolean>(false);

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('notbooks_stationery_sync');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'STATE_UPDATE' && data.state) {
        if (data.state.activeTool) setActiveTool(data.state.activeTool);
        if (data.state.brushColor) setBrushColor(data.state.brushColor);
        if (data.state.brushSize) setBrushSize(data.state.brushSize);
        if (data.state.fontFamily) setFontFamily(data.state.fontFamily);
        if (data.state.fontScale) setFontScale(data.state.fontScale);
        if (data.state.shapeKind) setShapeKind(data.state.shapeKind);
        if (typeof data.state.shapeFill === 'boolean') setShapeFill(data.state.shapeFill);
      }
    };

    // Request current notebook state from main window
    channel.postMessage({ type: 'REQUEST_INITIAL_STATE' });

    const handleLocalAdjust = (e: Event) => {
      const custom = e as CustomEvent<{ delta: number }>;
      channel.postMessage({ type: 'ADJUST_FONT_SIZE', delta: custom.detail?.delta || 0.25 });
    };
    window.addEventListener('adjust-notebook-font-size', handleLocalAdjust);

    return () => {
      window.removeEventListener('adjust-notebook-font-size', handleLocalAdjust);
      channel.close();
    };
  }, []);

  const handleChangeTool = (tool: ToolType) => {
    setActiveTool(tool);
    channelRef.current?.postMessage({ type: 'CHANGE_TOOL', tool });
  };

  const handleChangeColor = (color: string) => {
    setBrushColor(color);
    channelRef.current?.postMessage({ type: 'CHANGE_COLOR', color });
  };

  const handleChangeBrushSize = (size: number) => {
    setBrushSize(size);
    channelRef.current?.postMessage({ type: 'CHANGE_SIZE', size });
  };

  const handleChangeFont = (font: FontHandwriting) => {
    setFontFamily(font);
    channelRef.current?.postMessage({ type: 'CHANGE_FONT', font });
  };

  const handleChangeFontScale = (scale: number) => {
    setFontScale(scale);
    channelRef.current?.postMessage({ type: 'CHANGE_FONT_SCALE', scale });
  };

  const handleChangeShapeKind = (kind: ShapeKind) => {
    setShapeKind(kind);
    channelRef.current?.postMessage({ type: 'CHANGE_SHAPE_KIND', kind });
  };

  const handleChangeShapeFill = (fill: boolean) => {
    setShapeFill(fill);
    channelRef.current?.postMessage({ type: 'CHANGE_SHAPE_FILL', fill });
  };

  const handlePasteImage = (dataUrl: string) => {
    channelRef.current?.postMessage({ type: 'PASTE_IMAGE', dataUrl });
  };

  const handleClose = () => {
    if (window.electronAPI?.toggleToolsWindow) {
      window.electronAPI.toggleToolsWindow().catch(() => {});
    }
  };

  return (
    <div className="tools-window-shell">
      {/* Draggable header bar */}
      <div className="tools-window-drag-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7, fontSize: '0.72rem', fontWeight: 600 }}>
          <GripHorizontal size={13} />
          <span>Ferramentas</span>
        </div>
        <button 
          onClick={handleClose} 
          className="tools-window-close-btn"
          title="Fechar paleta de ferramentas (Pode reabrir pelo botão no topo do caderno)"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tools Content */}
      <div className="tools-window-content">
        <StationeryBar
          activeTool={activeTool}
          brushColor={brushColor}
          brushSize={brushSize}
          fontFamily={fontFamily}
          fontScale={fontScale}
          shapeKind={shapeKind}
          shapeFill={shapeFill}
          onChangeTool={handleChangeTool}
          onChangeColor={handleChangeColor}
          onChangeBrushSize={handleChangeBrushSize}
          onChangeFont={handleChangeFont}
          onChangeFontScale={handleChangeFontScale}
          onChangeShapeKind={handleChangeShapeKind}
          onChangeShapeFill={handleChangeShapeFill}
          onPasteImage={handlePasteImage}
        />
      </div>
    </div>
  );
};
