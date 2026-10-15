import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Page, Stroke, ToolType, Point, FontHandwriting, PaperColor, PaperPattern, ShapeKind } from '../types/notebook';
import { renderStrokesToCanvas } from '../utils/canvasRenderer';
import { Trash2, Undo2, Redo2, X } from 'lucide-react';

interface NotebookPageProps {
  page: Page;
  side: 'left' | 'right' | 'single';
  totalPages: number;
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  fontFamily: FontHandwriting;
  lineCount?: number;
  paperColor?: PaperColor;
  paperPattern?: PaperPattern;
  onUpdatePage: (updatedPage: Page) => void;
  onDeletePage?: (pageNumber: number) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onSelectTypeTool?: () => void;
  onPageOverflow?: (overflowText?: string) => void;
  shapeKind?: ShapeKind;
  shapeFill?: boolean;
  fontScale?: number;
}

export const NotebookPage: React.FC<NotebookPageProps> = ({
  page,
  side,
  totalPages,
  activeTool,
  brushColor,
  brushSize,
  fontFamily,
  lineCount = 16,
  paperColor = 'cream',
  paperPattern = 'ruled',
  onUpdatePage,
  onDeletePage,
  onNextPage,
  onPrevPage,
  onSelectTypeTool,
  onPageOverflow,
  shapeKind = 'rect',
  shapeFill = false,
  fontScale: _fontScale = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interiorRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastHtmlRef = useRef<string>('');
  const [interiorHeight, setInteriorHeight] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [plainLineCount, setPlainLineCount] = useState<number>(1);
  const currentStrokeRef = useRef<Point[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);

  // Redraw canvas strokes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderStrokesToCanvas(ctx, page.strokes, 1);
  }, [page.strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Keep canvas + line metrics in sync with the real page size (window may be resized)
  const redrawRef = useRef(redrawCanvas);
  useEffect(() => {
    redrawRef.current = redrawCanvas;
  }, [redrawCanvas]);

  useEffect(() => {
    const interior = interiorRef.current;
    if (!interior) return;

    const sync = () => {
      const canvas = canvasRef.current;
      const rect = interior.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setInteriorHeight(Math.round(rect.height));
        if (canvas && (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height))) {
          canvas.width = Math.round(rect.width);
          canvas.height = Math.round(rect.height);
          redrawRef.current();
        }
      }
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(interior);
    return () => observer.disconnect();
  }, []);

  // Undo and Redo handlers for strokes
  const handleUndoStroke = useCallback(() => {
    if (page.strokes.length === 0) return;
    const last = page.strokes[page.strokes.length - 1];
    const remaining = page.strokes.slice(0, -1);
    setRedoStrokes((prev) => [...prev, last]);
    onUpdatePage({
      ...page,
      strokes: remaining,
      updatedAt: Date.now(),
    });
  }, [page, onUpdatePage]);

  const handleRedoStroke = useCallback(() => {
    if (redoStrokes.length === 0) return;
    const restored = redoStrokes[redoStrokes.length - 1];
    const remainingRedo = redoStrokes.slice(0, -1);
    setRedoStrokes(remainingRedo);
    onUpdatePage({
      ...page,
      strokes: [...page.strokes, restored],
      updatedAt: Date.now(),
    });
  }, [page, redoStrokes, onUpdatePage]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y on drawings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement === editorRef.current ||
        document.activeElement === textareaRef.current
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedoStroke();
        } else {
          e.preventDefault();
          handleUndoStroke();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedoStroke();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndoStroke, handleRedoStroke]);

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const handleDeleteImage = useCallback((imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const latestPage = pageRef.current;
    onUpdatePage({
      ...latestPage,
      images: (latestPage.images || []).filter((img) => img.id !== imgId),
      updatedAt: Date.now(),
    });
  }, [onUpdatePage]);

  // Robust, 60fps image drag with pointer capture (Always draggable, never gets stuck)
  const handleImagePointerDown = (
    imgId: string,
    initialX: number,
    initialY: number,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let curX = initialX;
    let curY = initialY;

    el.classList.add('is-dragging');

    const onPointerMove = (evt: PointerEvent) => {
      evt.preventDefault();
      const deltaX = evt.clientX - startX;
      const deltaY = evt.clientY - startY;
      const parent = el.parentElement?.getBoundingClientRect();
      const maxX = parent ? Math.max(0, parent.width - el.offsetWidth) : 9999;
      const maxY = parent ? Math.max(0, parent.height - el.offsetHeight) : 9999;
      curX = Math.max(0, Math.min(maxX, initialX + deltaX));
      curY = Math.max(0, Math.min(maxY, initialY + deltaY));

      el.style.left = `${curX}px`;
      el.style.top = `${curY}px`;
    };

    const onPointerUp = (evt: PointerEvent) => {
      evt.preventDefault();
      el.classList.remove('is-dragging');
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // fallback
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const latestPage = pageRef.current;
      onUpdatePage({
        ...latestPage,
        images: (latestPage.images || []).map((img) =>
          img.id === imgId ? { ...img, x: curX, y: curY } : img
        ),
        updatedAt: Date.now(),
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Pointer drawing events
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'type') return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pt = getPointerPos(e);
    currentStrokeRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === 'type') return;

    const pt = getPointerPos(e);
    if (activeTool === 'shape') {
      // Shapes only need start + current end point
      currentStrokeRef.current = [currentStrokeRef.current[0], pt];
    } else {
      currentStrokeRef.current.push(pt);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempStroke: Stroke = {
      id: 'temp',
      tool: activeTool as Stroke['tool'],
      color: brushColor,
      size: brushSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1,
      points: currentStrokeRef.current,
      ...(activeTool === 'shape' ? { shape: shapeKind, fill: shapeFill } : {}),
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderStrokesToCanvas(ctx, [...page.strokes, tempStroke], 1);
  };

  const handlePointerUp = () => {
    if (!isDrawing || activeTool === 'type') return;
    setIsDrawing(false);

    if (currentStrokeRef.current.length > 1) {
      const newStroke: Stroke = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tool: activeTool as Stroke['tool'],
        color: brushColor,
        size: brushSize,
        opacity: activeTool === 'highlighter' ? 0.35 : 1,
        points: currentStrokeRef.current,
        ...(activeTool === 'shape' ? { shape: shapeKind, fill: shapeFill } : {}),
      };

      onUpdatePage({
        ...page,
        strokes: [...page.strokes, newStroke],
        updatedAt: Date.now(),
      });
      setRedoStrokes([]);
    }
    currentStrokeRef.current = [];
  };

  // Helper: Format raw text or HTML for initial content
  const formatInitialContent = (raw: string): string => {
    if (!raw) return '';
    // If it already contains HTML tags (spans, divs, br), keep as HTML
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      return raw;
    }
    // Convert plain text with newlines (\n) to HTML lines
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  };

  // Fixed Line Count & Natural typing
  const count = lineCount || 16;

  // Line height adapts to the real page height so ALL lines fit nicely
  const TEXT_TOP = 32;
  const TEXT_BOTTOM_GAP = 6;
  const availableHeight = interiorHeight > 0 ? interiorHeight - TEXT_TOP - TEXT_BOTTOM_GAP : count * 31;
  const lineHeight = Math.max(18, Math.min(42, Math.floor(availableHeight / count)));
  // Base font size is steady per line height and not globally scaled!
  const baseFontSize = Math.min(lineHeight * 0.95, lineHeight * 0.6);
  const maxHeight = count * lineHeight;

  // Handle rich editor input
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = currentHtml;

    const text = editorRef.current.innerText || '';
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    setPlainLineCount(Math.max(1, lines.length));

    if (text.trim().length === 0) {
      editorRef.current.setAttribute('data-empty', 'true');
    } else {
      editorRef.current.removeAttribute('data-empty');
    }

    onUpdatePage({
      ...pageRef.current,
      textContent: currentHtml,
      updatedAt: Date.now(),
    });
  }, [onUpdatePage]);

  // Punctual font size adjustment (selection-based or typing cursor)
  const adjustSelectionFontSize = useCallback((delta: number) => {
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!editor) return;

    // Check if selection is within this editor
    if (!sel || sel.rangeCount === 0 || !editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      return;
    }

    const range = sel.getRangeAt(0);

    // 1. If cursor is at a point (no text selected):
    // Insert a span with scale at cursor point so newly typed characters use this size
    if (sel.isCollapsed) {
      const span = document.createElement('span');
      const targetScale = delta > 0 ? 1.3 : 0.85;
      span.style.fontSize = `${targetScale}em`;
      const placeholder = document.createTextNode('\u200B'); // zero-width space
      span.appendChild(placeholder);
      range.insertNode(span);

      // Move cursor inside the span
      const newRange = document.createRange();
      newRange.setStart(placeholder, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      handleEditorInput();
      return;
    }

    // 2. Text IS selected:
    // Determine existing font scale
    let currentScale = 1.0;
    let targetSpan: HTMLElement | null = null;
    let node: Node | null = range.commonAncestorContainer;

    while (node && node !== editor) {
      if (node instanceof HTMLElement && node.style.fontSize) {
        targetSpan = node;
        const match = node.style.fontSize.match(/([\d.]+)em/);
        if (match) {
          currentScale = parseFloat(match[1]);
        }
        break;
      }
      node = node.parentNode;
    }

    let newScale = Math.round((currentScale + delta) * 100) / 100;
    newScale = Math.max(0.6, Math.min(2.8, newScale));

    // If whole span is selected and matches:
    if (targetSpan && targetSpan.textContent === range.toString()) {
      if (Math.abs(newScale - 1.0) < 0.05) {
        targetSpan.style.fontSize = '';
      } else {
        targetSpan.style.fontSize = `${newScale}em`;
      }
      handleEditorInput();
      return;
    }

    // Extract selected content
    const contents = range.extractContents();
    // Clean nested font-size spans to avoid compounding
    const innerSpans = contents.querySelectorAll?.('[style*="font-size"]');
    innerSpans?.forEach((s: Element) => {
      (s as HTMLElement).style.fontSize = '';
    });

    const span = document.createElement('span');
    span.style.fontSize = `${newScale}em`;
    span.appendChild(contents);
    range.insertNode(span);

    // Keep the wrapped text selected so user can press A+ or A- multiple times
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);

    handleEditorInput();
  }, [handleEditorInput]);

  // Global listener for punctual font size adjustment
  useEffect(() => {
    const handleAdjust = (e: Event) => {
      const custom = e as CustomEvent<{ delta: number }>;
      const delta = custom.detail?.delta || 0.25;

      const sel = window.getSelection();
      const editor = editorRef.current;
      if (!editor) return;

      const isInside = sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer);
      if (isInside) {
        adjustSelectionFontSize(delta);
      } else if (document.activeElement === editor) {
        adjustSelectionFontSize(delta);
      }
    };

    window.addEventListener('adjust-notebook-font-size', handleAdjust);
    return () => window.removeEventListener('adjust-notebook-font-size', handleAdjust);
  }, [adjustSelectionFontSize]);

  // Synchronize initial / external content
  useEffect(() => {
    if (editorRef.current) {
      const formatted = formatInitialContent(page.textContent || '');
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
        lastHtmlRef.current = formatted;
        const text = editorRef.current.innerText || '';
        if (text.trim().length === 0) {
          editorRef.current.setAttribute('data-empty', 'true');
        } else {
          editorRef.current.removeAttribute('data-empty');
        }
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        setPlainLineCount(Math.max(1, lines.length));
      }
    }
  }, [page.id, page.pageNumber]);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      const formatted = formatInitialContent(page.textContent || '');
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
        lastHtmlRef.current = formatted;
        const text = editorRef.current.innerText || '';
        if (text.trim().length === 0) {
          editorRef.current.setAttribute('data-empty', 'true');
        } else {
          editorRef.current.removeAttribute('data-empty');
        }
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        setPlainLineCount(Math.max(1, lines.length));
      }
    }
  }, [page.textContent]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Shortcuts for font size: Ctrl + / Ctrl - or Ctrl Shift > / <
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || (e.shiftKey && e.key === '>'))) {
      e.preventDefault();
      adjustSelectionFontSize(0.25);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || (e.shiftKey && e.key === '<'))) {
      e.preventDefault();
      adjustSelectionFontSize(-0.25);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const text = editorRef.current?.innerText || '';
      const lines = text.replace(/\r\n/g, '\n').split('\n');

      // If at or above line limit
      if (lines.length >= count) {
        const sel = window.getSelection();
        let isAtEnd = false;
        if (sel && sel.rangeCount > 0 && editorRef.current) {
          const range = sel.getRangeAt(0);
          const preRange = range.cloneRange();
          preRange.selectNodeContents(editorRef.current);
          preRange.setEnd(range.endContainer, range.endOffset);
          if (preRange.toString().length >= text.trimEnd().length) {
            isAtEnd = true;
          }
        }

        if (isAtEnd) {
          e.preventDefault();
          onPageOverflow?.('');
          return;
        }
      }
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // If an image is being pasted, let the dedicated movable image system handle it
    if (Array.from(e.clipboardData.items).some(item => item.type.startsWith('image/'))) {
      return;
    }
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      e.preventDefault();
      document.execCommand('insertText', false, text);
    }
  };

  const leafClass =
    side === 'left'
      ? 'page-leaf-base page-leaf-left'
      : side === 'right'
      ? 'page-leaf-base page-leaf-right'
      : 'page-leaf-base page-leaf-single';

  const effectivePattern = page.paperPattern || paperPattern;
  const isBlankPage = effectivePattern === 'blank';
  const isTyping = activeTool === 'type';

  const handlePageClick = () => {
    if (isTyping && editorRef.current) {
      editorRef.current.focus();
    }
  };

  const colorClass = `paper-color-${paperColor || 'cream'}`;
  const patternClass = `paper-pattern-${effectivePattern || 'ruled'}`;

  return (
    <div
      ref={containerRef}
      className={`${leafClass} ${colorClass} ${patternClass}`}
      onClick={handlePageClick}
    >
      {/* Top Page Action Controls (Undo / Redo / Delete Page) */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: side === 'left' ? 'auto' : '14px',
          left: side === 'left' ? '14px' : 'auto',
          zIndex: 35,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {/* Undo drawing stroke */}
        {page.strokes.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUndoStroke();
            }}
            title="Desfazer traço de desenho (Ctrl+Z)"
            style={{
              background: 'transparent',
              border: 'none',
              opacity: 0.45,
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Undo2 size={13} />
          </button>
        )}

        {/* Redo drawing stroke */}
        {redoStrokes.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRedoStroke();
            }}
            title="Refazer traço de desenho (Ctrl+Y)"
            style={{
              background: 'transparent',
              border: 'none',
              opacity: 0.45,
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Redo2 size={13} />
          </button>
        )}

        {/* Delete current page button */}
        {totalPages > 1 && onDeletePage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePage(page.pageNumber);
            }}
            title={`Excluir página ${page.pageNumber}`}
            style={{
              background: 'transparent',
              border: 'none',
              opacity: 0.35,
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Page Interior: Lines + Textarea + Images + Drawing Canvas */}
      <div ref={interiorRef} className={`page-interior ${isTyping ? 'mode-typing' : 'mode-drawing'}`}>
        {/* Pattern layer (ruled, grid, dotted, etc.) - Hidden if blank */}
        {!isBlankPage && (
          <div
            className="ruled-lines-layer"
            style={{
              backgroundSize: effectivePattern === 'grid' || effectivePattern === 'dotted' ? '24px 24px' : `100% ${lineHeight}px`,
              height: `${maxHeight}px`,
            }}
          />
        )}

        {/* Rich Text Editor for typing notes (Supports punctual font sizing and ruled lines!) */}
        <div
          ref={editorRef}
          contentEditable={isTyping}
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handleEditorPaste}
          data-placeholder={isTyping ? (isBlankPage ? "Página em branco: clique e escreva livremente..." : "Clique e comece a escrever...") : ""}
          className="page-ruled-textarea page-rich-editor"
          data-page-side={side}
          data-page-number={page.pageNumber}
          data-page-editor="true"
          style={{
            fontFamily: fontFamily,
            lineHeight: `${lineHeight}px`,
            fontSize: `${baseFontSize.toFixed(1)}px`,
            height: `${maxHeight}px`,
            maxHeight: `${maxHeight}px`,
            overflowY: 'auto',
          }}
          spellCheck={false}
          onFocus={() => {
            if (!isTyping && onSelectTypeTool) {
              onSelectTypeTool();
            }
          }}
        />

        {/* Pasted Images Layer (Draggable at 60fps, always on top of text/canvas) */}
        {(page.images || []).map((img) => (
          <div
            key={img.id}
            className="page-pasted-image"
            onPointerDown={(e) => handleImagePointerDown(img.id, img.x, img.y, e)}
            style={{
              position: 'absolute',
              left: `${img.x}px`,
              top: `${img.y}px`,
              zIndex: 50,
              padding: 0,
              background: 'transparent',
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
              lineHeight: 0,
            }}
            title="Arraste para mover • Clique no X para excluir"
          >
            <img
              src={img.dataUrl}
              alt="Anotação colada"
              style={{
                display: 'block',
                maxWidth: '240px',
                maxHeight: '180px',
                pointerEvents: 'none',
              }}
            />
            <button
              onClick={(e) => handleDeleteImage(img.id, e)}
              onPointerDown={(e) => e.stopPropagation()}
              title="Excluir imagem"
              className="pasted-image-delete"
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                zIndex: 55,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Canvas for freehand mouse/pen drawing */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="page-drawing-canvas"
          style={{
            cursor:
              activeTool === 'type'
                ? 'text'
                : activeTool === 'eraser'
                ? 'cell'
                : 'crosshair',
            touchAction: 'none',
          }}
        />
      </div>

      {/* Subtle Page Footer with Line Counter */}
      <div className="page-footer">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{side === 'left' || side === 'single' ? 'NotBooks' : ''}</span>
          <span
            className="line-counter-pill"
            title={`Página: ${plainLineCount}/${count} linhas preenchidas`}
          >
            {plainLineCount}/{count} linhas
          </span>
        </span>
        <span style={{ fontWeight: 600 }}>{page.pageNumber}</span>
      </div>

      {/* Corner Turn Hotspots */}
      {(side === 'right' || side === 'single') && onNextPage && page.pageNumber < totalPages && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onNextPage();
          }}
          title="Próxima página (ou use →)"
          className="corner-curl-trigger right"
        >
          <div className="corner-curl-fold" />
        </div>
      )}

      {(side === 'left' || side === 'single') && onPrevPage && page.pageNumber > 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onPrevPage();
          }}
          title="Página anterior (ou use ←)"
          className="corner-curl-trigger left"
        >
          <div className="corner-curl-fold" />
        </div>
      )}
    </div>
  );
};
