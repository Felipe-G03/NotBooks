import { useState, useEffect, useCallback, useRef } from 'react';
import type { Notebook, ToolType, FontHandwriting, PageImage, ShapeKind } from './types/notebook';
import { loadLibrary, saveLibrary } from './utils/storage';
import { BookViewer } from './components/BookViewer';
import { Bookshelf } from './components/Bookshelf';
import { StationeryBar } from './components/StationeryBar';
import { NewNotebookModal } from './components/NewNotebookModal';
import { ToolsWindowApp } from './components/ToolsWindowApp';

export function App() {
  const isToolsWindow = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('window') === 'tools';

  if (isToolsWindow) {
    return <ToolsWindowApp />;
  }

  return <NotebookMainApp />;
}

function NotebookMainApp() {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => loadLibrary());
  const [currentView, setCurrentView] = useState<'notebook' | 'library'>('notebook');
  
  // Directly open the active notebook!
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(
    () => notebooks[0]?.id || null
  );

  // Active Stationery Tools
  const [activeTool, setActiveTool] = useState<ToolType>('type');
  const [brushColor, setBrushColor] = useState<string>('#18181b');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect');
  const [shapeFill, setShapeFill] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showStationeryBar, setShowStationeryBar] = useState<boolean>(true);

  // Sync with localStorage
  useEffect(() => {
    saveLibrary(notebooks);
  }, [notebooks]);

  const activeNotebook =
    notebooks.find((nb) => nb.id === activeNotebookId) || notebooks[0] || null;

  const activeNotebookRef = useRef(activeNotebook);
  useEffect(() => {
    activeNotebookRef.current = activeNotebook;
  }, [activeNotebook]);

  const handleUpdateNotebook = useCallback((updated: Notebook) => {
    setNotebooks((prev) =>
      prev.map((nb) => (nb.id === updated.id ? updated : nb))
    );
  }, []);

  const handlePasteImageToActivePage = useCallback((dataUrl: string) => {
    const currentBook = activeNotebookRef.current;
    if (!currentBook) return;
    const currentPNum = currentBook.currentPage || 1;
    const targetPage = currentBook.pages.find((p) => p.pageNumber === currentPNum) || currentBook.pages[0];
    if (!targetPage) return;

    const newImage: PageImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dataUrl,
      x: 35,
      y: 50 + ((targetPage.images || []).length * 15),
      width: 200,
      height: 150,
    };

    const updatedPages = currentBook.pages.map((p) =>
      p.id === targetPage.id ? { ...p, images: [...(p.images || []), newImage], updatedAt: Date.now() } : p
    );

    handleUpdateNotebook({
      ...currentBook,
      pages: updatedPages,
      updatedAt: Date.now(),
    });
  }, [handleUpdateNotebook]);

  const handleChangeFont = useCallback((font: FontHandwriting) => {
    const currentBook = activeNotebookRef.current;
    if (!currentBook) return;
    handleUpdateNotebook({
      ...currentBook,
      fontFamily: font,
    });
  }, [handleUpdateNotebook]);

  const handleChangeFontScale = useCallback((scale: number) => {
    const currentBook = activeNotebookRef.current;
    if (!currentBook) return;
    const clamped = Math.max(0.7, Math.min(1.6, Math.round(scale * 100) / 100));
    handleUpdateNotebook({
      ...currentBook,
      fontScale: clamped,
    });
  }, [handleUpdateNotebook]);

  // Cross-Window BroadcastChannel sync with separate floating tools window
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('notbooks_stationery_sync');
    syncChannelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      switch (data.type) {
        case 'CHANGE_TOOL':
          if (data.tool) setActiveTool(data.tool);
          break;
        case 'CHANGE_COLOR':
          if (data.color) setBrushColor(data.color);
          break;
        case 'CHANGE_SIZE':
          if (typeof data.size === 'number') setBrushSize(data.size);
          break;
        case 'CHANGE_FONT':
          if (data.font) handleChangeFont(data.font);
          break;
        case 'CHANGE_FONT_SCALE':
          if (typeof data.scale === 'number') handleChangeFontScale(data.scale);
          break;
        case 'ADJUST_FONT_SIZE':
          if (typeof data.delta === 'number') {
            window.dispatchEvent(new CustomEvent('adjust-notebook-font-size', { detail: { delta: data.delta } }));
          }
          break;
        case 'CHANGE_SHAPE_KIND':
          if (data.kind) setShapeKind(data.kind);
          break;
        case 'CHANGE_SHAPE_FILL':
          if (typeof data.fill === 'boolean') setShapeFill(data.fill);
          break;
        case 'PASTE_IMAGE':
          if (data.dataUrl) handlePasteImageToActivePage(data.dataUrl);
          break;
        case 'REQUEST_INITIAL_STATE':
          channel.postMessage({
            type: 'STATE_UPDATE',
            state: {
              activeTool,
              brushColor,
              brushSize,
              fontFamily: activeNotebookRef.current?.fontFamily || 'Caveat',
              fontScale: activeNotebookRef.current?.fontScale || 1,
              shapeKind,
              shapeFill,
            },
          });
          break;
      }
    };

    return () => {
      channel.close();
    };
  }, [handlePasteImageToActivePage, handleChangeFont, handleChangeFontScale, activeTool, brushColor, brushSize, shapeKind, shapeFill]);

  // Broadcast any tool change initiated from main notebook (shortcuts, color toggles)
  useEffect(() => {
    syncChannelRef.current?.postMessage({
      type: 'STATE_UPDATE',
      state: {
        activeTool,
        brushColor,
        brushSize,
        fontFamily: activeNotebook?.fontFamily || 'Caveat',
        fontScale: activeNotebook?.fontScale || 1,
        shapeKind,
        shapeFill,
      },
    });
  }, [activeTool, brushColor, brushSize, activeNotebook?.fontFamily, activeNotebook?.fontScale, shapeKind, shapeFill]);

  // Global paste, keydown Ctrl+V and CustomEvent listeners: 100% reliable image capture
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // 1. Check DOM clipboard items (web copy, screenshot paste)
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (dataUrl) handlePasteImageToActivePage(dataUrl);
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }
      }

      // 2. Native Electron clipboard check (Windows Snipping Tool, Win+Shift+S)
      if (window.electronAPI?.readClipboardImage) {
        try {
          const nativeImg = await window.electronAPI.readClipboardImage();
          if (nativeImg) {
            e.preventDefault();
            handlePasteImageToActivePage(nativeImg);
            return;
          }
        } catch {
          // ignore
        }
      }
    };

    // 3. Global Ctrl+V hotkey backup when focus is anywhere on the window
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const activeEl = document.activeElement;
        const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

        // Check if Electron has an image in clipboard
        if (window.electronAPI?.readClipboardImage) {
          try {
            const nativeImg = await window.electronAPI.readClipboardImage();
            if (nativeImg) {
              e.preventDefault();
              handlePasteImageToActivePage(nativeImg);
              return;
            }
          } catch {
            // ignore
          }
        }

        // If not focusing an input, try modern navigator.clipboard
        if (!isInput && navigator.clipboard?.read) {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              const imgType = item.types.find((t) => t.startsWith('image/'));
              if (imgType) {
                e.preventDefault();
                const blob = await item.getType(imgType);
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const url = ev.target?.result as string;
                  if (url) handlePasteImageToActivePage(url);
                };
                reader.readAsDataURL(blob);
                return;
              }
            }
          } catch {
            // ignore
          }
        }
      }
    };

    // 4. Custom event dispatched by StationeryBar or file picker
    const handleCustomInsert = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        handlePasteImageToActivePage(customEvent.detail);
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('insert-notebook-image', handleCustomInsert);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('insert-notebook-image', handleCustomInsert);
    };
  }, [handlePasteImageToActivePage]);

  const handleCreateNotebook = (newBook: Notebook) => {
    setNotebooks((prev) => [newBook, ...prev]);
    setActiveNotebookId(newBook.id);
    setCurrentView('notebook');
  };

  const handleDeleteNotebook = (id: string) => {
    setNotebooks((prev) => prev.filter((nb) => nb.id !== id));
    if (activeNotebookId === id) {
      const remaining = notebooks.filter((nb) => nb.id !== id);
      setActiveNotebookId(remaining[0]?.id || null);
    }
  };

  return (
    <div className="app-container">
      {currentView === 'notebook' && activeNotebook ? (
        <>
          {/* Focused Floating Notebook */}
          <BookViewer
            notebook={activeNotebook}
            allNotebooks={notebooks}
            activeTool={activeTool}
            brushColor={brushColor}
            brushSize={brushSize}
            onUpdateNotebook={handleUpdateNotebook}
            onSelectNotebook={(id) => setActiveNotebookId(id)}
            onOpenLibrary={() => setCurrentView('library')}
            onOpenCreateModal={() => setIsNewModalOpen(true)}
            onChangeTool={setActiveTool}
            onChangeBrushSize={setBrushSize}
            shapeKind={shapeKind}
            shapeFill={shapeFill}
            isToolsVisible={showStationeryBar}
            onToggleTools={() => setShowStationeryBar((prev) => !prev)}
          />

          {/* Floating Stationery Dock: visible by default and toggleable via Palette button 🎨 */}
          {showStationeryBar && (
            <StationeryBar
              activeTool={activeTool}
              brushColor={brushColor}
              brushSize={brushSize}
              fontFamily={activeNotebook.fontFamily}
              onChangeTool={setActiveTool}
              onChangeColor={setBrushColor}
              onChangeFont={handleChangeFont}
              onChangeBrushSize={setBrushSize}
              onPasteImage={handlePasteImageToActivePage}
              fontScale={activeNotebook.fontScale || 1}
              onChangeFontScale={handleChangeFontScale}
              shapeKind={shapeKind}
              shapeFill={shapeFill}
              onChangeShapeKind={setShapeKind}
              onChangeShapeFill={setShapeFill}
              onClose={() => setShowStationeryBar(false)}
            />
          )}
        </>
      ) : (
        /* The Bookshelf Library: View all notebooks & custom covers */
        <Bookshelf
          notebooks={notebooks}
          onSelectNotebook={(nb) => {
            setActiveNotebookId(nb.id);
            setCurrentView('notebook');
          }}
          onDeleteNotebook={handleDeleteNotebook}
          onOpenCreateModal={() => setIsNewModalOpen(true)}
          onCloseLibrary={activeNotebook ? () => setCurrentView('notebook') : undefined}
        />
      )}

      {/* Modal to create a new notebook with custom cover */}
      <NewNotebookModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateNotebook}
      />
    </div>
  );
}

export default App;
