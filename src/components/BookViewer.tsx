import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Notebook, ToolType, Page, Bookmark, PaperPattern, ShapeKind } from '../types/notebook';
import { NotebookPage } from './NotebookPage';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Check,
  Plus,
  FileText, 
  Sun, 
  Moon,
  Columns2,
  Square,
  Pin,
  BookOpen,
  Trash2,
  Minus,
  X,
  Eye,
  Keyboard,
  GripHorizontal,
  Bookmark as BookmarkIcon,
  Palette
} from 'lucide-react';

interface BookViewerProps {
  notebook: Notebook;
  allNotebooks: Notebook[];
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  onUpdateNotebook: (updated: Notebook) => void;
  onSelectNotebook: (id: string) => void;
  onOpenLibrary: () => void;
  onOpenCreateModal?: () => void;
  onChangeTool?: (tool: ToolType) => void;
  onChangeBrushSize?: (size: number) => void;
  shapeKind?: ShapeKind;
  shapeFill?: boolean;
  isToolsVisible?: boolean;
  onToggleTools?: () => void;
}

const RIBBON_COLORS = [
  { name: 'Dourado', color: '#f59e0b' },
  { name: 'Carmim', color: '#dc2626' },
  { name: 'Safira', color: '#2563eb' },
  { name: 'Esmeralda', color: '#10b981' },
  { name: 'Ametista', color: '#8b5cf6' },
];

export const BookViewer: React.FC<BookViewerProps> = ({
  notebook,
  allNotebooks,
  activeTool,
  brushColor,
  brushSize,
  onUpdateNotebook,
  onSelectNotebook,
  onOpenLibrary,
  onOpenCreateModal,
  onChangeTool,
  onChangeBrushSize,
  shapeKind,
  shapeFill,
  isToolsVisible,
  onToggleTools,
}) => {
  const [viewMode, setViewMode] = useState<'double' | 'single'>('single');
  const [currentPage, setCurrentPage] = useState<number>(notebook.currentPage || 1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(true);
  const [isCompactWindow, setIsCompactWindow] = useState<boolean>(true);
  const [windowOpacity, setWindowOpacity] = useState<number>(1.0);
  const [isNotebookMenuOpen, setIsNotebookMenuOpen] = useState<boolean>(false);
  const [isBookmarkMenuOpen, setIsBookmarkMenuOpen] = useState<boolean>(false);
  const [showShortcutModal, setShowShortcutModal] = useState<boolean>(false);
  const [selectedRibbonColor, setSelectedRibbonColor] = useState<string>('#f59e0b');
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(true);
  const [bookmarkTitleInput, setBookmarkTitleInput] = useState<string>('');

  const menuRef = useRef<HTMLDivElement | null>(null);
  const bookmarkRef = useRef<HTMLDivElement | null>(null);
  const bookmarkInputRef = useRef<HTMLInputElement | null>(null);

  const isElectron = Boolean(window.electronAPI?.isNativeDesktop);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsNotebookMenuOpen(false);
      }
      if (bookmarkRef.current && !bookmarkRef.current.contains(e.target as Node)) {
        setIsBookmarkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const pages = notebook.pages;
  const totalPages = pages.length;

  const prevBookIdRef = useRef(notebook.id);
  useEffect(() => {
    if (prevBookIdRef.current !== notebook.id) {
      prevBookIdRef.current = notebook.id;
      setCurrentPage(notebook.currentPage || 1);
    }
  }, [notebook.id, notebook.currentPage]);

  // Maintain natural page aspect ratio: if window shrinks below 700px, automatically switch 2 pages -> 1 page
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 700 && viewMode === 'double') {
        setViewMode('single');
        setIsCompactWindow(true);
        if (window.electronAPI?.toggleCompactMode) {
          window.electronAPI.toggleCompactMode(true).catch(() => {});
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Sync Electron states on mount
  useEffect(() => {
    const electron = window.electronAPI;
    if (!electron) return;

    electron.getAlwaysOnTop?.().then((val) => setIsAlwaysOnTop(val)).catch(() => {});
    electron.getToolsVisibility?.().then((val) => setIsToolsOpen(val)).catch(() => {});
    electron.getCompactMode?.().then((val) => {
      setIsCompactWindow(val);
      if (val) setViewMode('single');
    }).catch(() => {});

    const unsubscribeCompact = electron.onCompactModeChanged?.((isCompact) => {
      setIsCompactWindow(isCompact);
      if (isCompact) {
        setViewMode('single');
      }
    });

    const unsubscribePin = electron.onAlwaysOnTopChanged?.((isTop) => {
      setIsAlwaysOnTop(isTop);
    });

    return () => {
      unsubscribeCompact?.();
      unsubscribePin?.();
    };
  }, []);

  const handleTogglePin = async () => {
    const electron = window.electronAPI;
    if (electron?.toggleAlwaysOnTop) {
      try {
        const newVal = await electron.toggleAlwaysOnTop();
        setIsAlwaysOnTop(newVal);
      } catch {
        // ignore
      }
    } else {
      setIsAlwaysOnTop(!isAlwaysOnTop);
    }
  };

  // 1 page <-> 2 pages: switches the view AND resizes the native window to fit
  const handleSetViewMode = async (mode: 'single' | 'double') => {
    setViewMode(mode);
    const wantCompact = mode === 'single';
    setIsCompactWindow(wantCompact);
    if (window.electronAPI?.toggleCompactMode) {
      try {
        await window.electronAPI.toggleCompactMode(wantCompact);
      } catch {
        // ignore
      }
    }
    if (mode === 'double') {
      setCurrentPage((p) => (p % 2 === 0 ? p - 1 : p));
    }
  };

  const handleCycleOpacity = async () => {
    const electron = window.electronAPI;
    // Single click toggles between opaque and the translucent mode
    const nextVal = windowOpacity < 0.99 ? 1.0 : 0.62;
    setWindowOpacity(nextVal);

    if (electron?.setWindowOpacity) {
      try {
        await electron.setWindowOpacity(nextVal);
      } catch {
        // ignore
      }
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleHideToTray = () => {
    window.electronAPI?.hideWindow?.();
  };

  const updatePage = useCallback((updatedPage: Page) => {
    const updatedPages = notebook.pages.map((p) =>
      p.id === updatedPage.id ? updatedPage : p
    );
    onUpdateNotebook({
      ...notebook,
      pages: updatedPages,
      updatedAt: Date.now(),
    });
  }, [notebook, onUpdateNotebook]);

  const handleNextPage = useCallback(() => {
    const step = viewMode === 'double' ? 2 : 1;
    if (currentPage < totalPages) {
      const nextPage = Math.min(currentPage + step, totalPages);
      setCurrentPage(nextPage);
      onUpdateNotebook({
        ...notebook,
        currentPage: nextPage,
      });
    }
  }, [currentPage, totalPages, viewMode, notebook, onUpdateNotebook]);

  const handlePrevPage = useCallback(() => {
    const step = viewMode === 'double' ? 2 : 1;
    if (currentPage > 1) {
      const prevPage = Math.max(currentPage - step, 1);
      setCurrentPage(prevPage);
      onUpdateNotebook({
        ...notebook,
        currentPage: prevPage,
      });
    }
  }, [currentPage, viewMode, notebook, onUpdateNotebook]);

  // Add Page (Ruled or Blank)
  const handleAddNewPage = useCallback((pattern: PaperPattern = notebook.paperPattern || 'ruled', initialText: string = '') => {
    const newPageNumber = totalPages + 1;
    const newPage: Page = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      pageNumber: newPageNumber,
      paperPattern: pattern,
      textContent: initialText,
      strokes: [],
      updatedAt: Date.now(),
    };

    const updatedPages = [...notebook.pages, newPage];
    onUpdateNotebook({
      ...notebook,
      pages: updatedPages,
      currentPage: newPageNumber,
      updatedAt: Date.now(),
    });

    if (viewMode === 'double') {
      const target = newPageNumber % 2 === 0 ? newPageNumber - 1 : newPageNumber;
      setCurrentPage(target);
    } else {
      setCurrentPage(newPageNumber);
    }
  }, [notebook, totalPages, viewMode, onUpdateNotebook]);

  // Auto overflow: Jump to next page when current page lines limit is exceeded
  const handlePageOverflow = useCallback((overflowText?: string) => {
    if (currentPage < totalPages) {
      // Advance to existing next page
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      onUpdateNotebook({
        ...notebook,
        currentPage: nextP,
      });

      if (overflowText) {
        const targetPage = notebook.pages[nextP - 1];
        if (targetPage) {
          const updatedContent = targetPage.textContent 
            ? `${overflowText}\n${targetPage.textContent}` 
            : overflowText;
          updatePage({
            ...targetPage,
            textContent: updatedContent,
          });
        }
      }
    } else {
      // Create new page automatically!
      handleAddNewPage(notebook.paperPattern, overflowText || '');
    }
  }, [currentPage, totalPages, notebook, handleAddNewPage, onUpdateNotebook, updatePage]);

  // Remove / Delete Page
  const handleDeletePage = (pageNumber: number) => {
    if (totalPages <= 1) {
      alert('O caderno precisa ter pelo menos 1 página.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja remover a Página ${pageNumber}?`)) {
      const remainingPages = notebook.pages
        .filter((p) => p.pageNumber !== pageNumber)
        .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

      const newCurrent = Math.max(1, Math.min(currentPage, remainingPages.length));
      onUpdateNotebook({
        ...notebook,
        pages: remainingPages,
        currentPage: newCurrent,
        bookmarks: (notebook.bookmarks || []).filter((b) => b.pageNumber !== pageNumber),
        updatedAt: Date.now(),
      });
      setCurrentPage(newCurrent);
    }
  };

  // Bookmark Management
  const bookmarks = notebook.bookmarks || [];
  const currentBookmark = bookmarks.find((b) => b.pageNumber === currentPage);

  const openBookmarkMenu = useCallback(() => {
    const list = notebook.bookmarks || [];
    const existing = list.find((b) => b.pageNumber === currentPage);
    if (existing) {
      setBookmarkTitleInput(existing.title || '');
      setSelectedRibbonColor(existing.color);
    } else {
      setBookmarkTitleInput('');
    }
    setIsBookmarkMenuOpen(true);
    setTimeout(() => {
      bookmarkInputRef.current?.focus();
    }, 60);
  }, [notebook.bookmarks, currentPage]);

  const handleSaveBookmark = useCallback(() => {
    const list = notebook.bookmarks || [];
    const exists = list.find((b) => b.pageNumber === currentPage);
    const title = bookmarkTitleInput.trim() || `Página ${currentPage}`;
    let updatedBookmarks: Bookmark[];

    if (exists) {
      updatedBookmarks = list.map((b) =>
        b.pageNumber === currentPage
          ? { ...b, title, color: selectedRibbonColor, updatedAt: Date.now() }
          : b
      );
    } else {
      const newBookmark: Bookmark = {
        id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        pageNumber: currentPage,
        title,
        color: selectedRibbonColor,
        createdAt: Date.now(),
      };
      updatedBookmarks = [...list, newBookmark];
    }

    onUpdateNotebook({
      ...notebook,
      bookmarks: updatedBookmarks,
      updatedAt: Date.now(),
    });

    setIsBookmarkMenuOpen(false);
  }, [notebook, currentPage, bookmarkTitleInput, selectedRibbonColor, onUpdateNotebook]);

  const handleDeleteBookmark = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNotebook({
      ...notebook,
      bookmarks: (notebook.bookmarks || []).filter((b) => b.id !== id),
      updatedAt: Date.now(),
    });
  }, [notebook, onUpdateNotebook]);

  // Compute pages currently on stage
  let leftPage: Page | undefined;
  let rightPage: Page | undefined;
  let singlePage: Page | undefined;

  if (viewMode === 'double') {
    const leftIndex = currentPage % 2 === 0 ? currentPage - 2 : currentPage - 1;
    const rightIndex = leftIndex + 1;
    leftPage = pages[leftIndex];
    rightPage = pages[rightIndex];
  } else {
    singlePage = pages[currentPage - 1];
  }

  // Ref to queue focus after page turn
  const pendingFocusSideRef = useRef<'left' | 'right' | 'single' | null>(null);

  const focusPageTextarea = useCallback((side: 'left' | 'right' | 'single') => {
    if (activeTool !== 'type') {
      onChangeTool?.('type');
    }
    requestAnimationFrame(() => {
      const selector = side === 'single'
        ? '.page-leaf-single [data-page-editor="true"], .page-leaf-single textarea'
        : side === 'left'
        ? '.page-leaf-left [data-page-editor="true"], .page-leaf-left textarea'
        : '.page-leaf-right [data-page-editor="true"], .page-leaf-right textarea';
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement) {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        } else {
          try {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch {
            // fallback focus
          }
        }
      }
    });
  }, [activeTool, onChangeTool]);

  useEffect(() => {
    if (pendingFocusSideRef.current) {
      const side = pendingFocusSideRef.current;
      pendingFocusSideRef.current = null;
      const timer = setTimeout(() => {
        focusPageTextarea(side);
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [currentPage, totalPages, focusPageTextarea]);

  // Keyboard shortcuts (Shift+Arrow=Smart Page Navigation, T=Text, P=Pen, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;

      // 1. SMART PAGE NAVIGATION SHORTCUT: Shift + ArrowRight / Shift + ArrowLeft
      // In 2-page view: Shift+Right moves cursor from left to right page, or turns page if on right.
      // In 1-page view: Shift+Right / Shift+Left turns the page immediately.
      if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();

        if (viewMode === 'single') {
          if (e.key === 'ArrowRight') {
            if (currentPage < totalPages) {
              const nextP = currentPage + 1;
              setCurrentPage(nextP);
              onUpdateNotebook({ ...notebook, currentPage: nextP });
              pendingFocusSideRef.current = 'single';
            } else {
              pendingFocusSideRef.current = 'single';
              handleAddNewPage(notebook.paperPattern || 'ruled');
            }
          } else {
            // Shift + ArrowLeft
            if (currentPage > 1) {
              const prevP = currentPage - 1;
              setCurrentPage(prevP);
              onUpdateNotebook({ ...notebook, currentPage: prevP });
              pendingFocusSideRef.current = 'single';
            }
          }
          return;
        }

        // viewMode === 'double'
        const activeSide =
          activeEl?.getAttribute('data-page-side') ||
          (activeEl?.closest('.page-leaf-left') ? 'left' : null) ||
          (activeEl?.closest('.page-leaf-right') ? 'right' : null) ||
          (currentPage % 2 === 0 ? 'right' : 'left');

        if (e.key === 'ArrowRight') {
          if (activeSide === 'left') {
            // Cursor moves to the second (right) page of current spread
            if (rightPage) {
              setCurrentPage(rightPage.pageNumber);
              onUpdateNotebook({ ...notebook, currentPage: rightPage.pageNumber });
              focusPageTextarea('right');
            } else {
              pendingFocusSideRef.current = 'right';
              handleAddNewPage(notebook.paperPattern || 'ruled');
            }
          } else {
            // On the second (right) page: flip to the next page spread!
            const leftIndex = currentPage % 2 === 0 ? currentPage - 2 : currentPage - 1;
            const nextSpreadLeftPage = leftIndex + 3;
            if (nextSpreadLeftPage <= totalPages) {
              setCurrentPage(nextSpreadLeftPage);
              onUpdateNotebook({ ...notebook, currentPage: nextSpreadLeftPage });
              pendingFocusSideRef.current = 'left';
            } else {
              pendingFocusSideRef.current = 'left';
              handleAddNewPage(notebook.paperPattern || 'ruled');
            }
          }
        } else {
          // Shift + ArrowLeft
          if (activeSide === 'right') {
            // Cursor moves back to the first (left) page of current spread
            if (leftPage) {
              setCurrentPage(leftPage.pageNumber);
              onUpdateNotebook({ ...notebook, currentPage: leftPage.pageNumber });
              focusPageTextarea('left');
            }
          } else {
            // On first (left) page: flip back to the previous page spread!
            const leftIndex = currentPage % 2 === 0 ? currentPage - 2 : currentPage - 1;
            const prevSpreadRightPage = leftIndex;
            if (prevSpreadRightPage >= 1) {
              setCurrentPage(prevSpreadRightPage);
              onUpdateNotebook({ ...notebook, currentPage: prevSpreadRightPage });
              pendingFocusSideRef.current = 'right';
            }
          }
        }
        return;
      }

      // 2. TOGGLE TOOLS BAR: Shift + ArrowUp
      if (e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        if (onToggleTools) {
          onToggleTools();
        } else {
          setIsToolsOpen((prev) => !prev);
        }
        return;
      }

      // 3. OPEN BOOKMARK MENU (WITH NAME & COLOR): Shift + ArrowDown
      if (e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        openBookmarkMenu();
        return;
      }

      // If user is actively typing in input, textarea, or rich contenteditable, don't trigger tool shortcuts
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (isInput) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Tool Switching
      if (key === 't') {
        e.preventDefault();
        onChangeTool?.('type');
      } else if (key === 'p') {
        e.preventDefault();
        onChangeTool?.('pen');
      } else if (key === 'l' || key === 'b') {
        e.preventDefault();
        onChangeTool?.('pencil');
      } else if (key === 'h') {
        e.preventDefault();
        onChangeTool?.('highlighter');
      } else if (key === 'e') {
        e.preventDefault();
        onChangeTool?.('eraser');
      } else if (key === 's') {
        e.preventDefault();
        onChangeTool?.('shape');
      } else if (e.key === '1') {
        onChangeTool?.('type');
      } else if (e.key === '2') {
        onChangeTool?.('pen');
      } else if (e.key === '3') {
        onChangeTool?.('pencil');
      } else if (e.key === '4') {
        onChangeTool?.('highlighter');
      } else if (e.key === '5') {
        onChangeTool?.('eraser');
      }
      // Brush size adjustments
      else if (e.key === '[') {
        e.preventDefault();
        onChangeBrushSize?.(Math.max(1, brushSize - 1));
      } else if (e.key === ']') {
        e.preventDefault();
        onChangeBrushSize?.(Math.min(24, brushSize + 1));
      }
      // Quick hide with Esc
      else if (e.key === 'Escape') {
        if (showShortcutModal) {
          setShowShortcutModal(false);
          return;
        }
        if (isNotebookMenuOpen) {
          setIsNotebookMenuOpen(false);
          return;
        }
        if (isBookmarkMenuOpen) {
          setIsBookmarkMenuOpen(false);
          return;
        }
        if (window.electronAPI?.hideWindow) {
          window.electronAPI.hideWindow();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNextPage, 
    handlePrevPage, 
    handleAddNewPage,
    showShortcutModal, 
    isNotebookMenuOpen, 
    isBookmarkMenuOpen, 
    onChangeTool, 
    onChangeBrushSize, 
    brushSize, 
    currentPage, 
    totalPages,
    viewMode,
    notebook,
    onUpdateNotebook,
    leftPage,
    rightPage,
    focusPageTextarea,
    openBookmarkMenu,
    onToggleTools
  ]);

  const themeClass = isDarkMode ? 'theme-dark-notebook' : 'theme-light-notebook';
  const spreadClass = viewMode === 'double' ? 'double-spread' : 'single-page';
  
  // Real cover color: strictly respect notebook.cover.color
  const activeCoverColor = isDarkMode ? '#1a1d24' : (notebook.cover?.color || '#1b3b2b');

  return (
    <div className={`book-viewer-root ${isCompactWindow ? 'compact-floating-mode' : ''}`}>
      {/* Floating App Drag Bar / Header */}
      <header className="lean-top-bar floating-drag-header">
        {/* Left: Drag Handle + Unified Notebook Switcher */}
        <div className="top-bar-left" ref={menuRef}>
          <div className="window-drag-region" title="Clique e arraste para mover o caderno flutuante">
            <GripHorizontal size={14} className="drag-icon-grip" />
          </div>

          <div className="notebook-menu-container no-drag">
            {/* The Unified Notebook Menu Trigger */}
            <button
              onClick={() => setIsNotebookMenuOpen(!isNotebookMenuOpen)}
              className={`notebook-menu-trigger ${isNotebookMenuOpen ? 'active' : ''}`}
              title="Menu dos Cadernos: Alternar entre cadernos, criar novo ou ver estante"
            >
              <div 
                className="mini-book-badge" 
                style={{ backgroundColor: notebook.cover.color }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', maxWidth: isCompactWindow ? '110px' : '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {notebook.title}
                </span>
                <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.5)', marginTop: '-1px' }}>
                  pág {currentPage}/{totalPages}
                </span>
              </div>
              <ChevronDown 
                size={13} 
                style={{ 
                  opacity: 0.7, 
                  transform: isNotebookMenuOpen ? 'rotate(180deg)' : 'none', 
                  transition: 'transform 0.2s',
                  marginLeft: '2px'
                }} 
              />
            </button>

            {/* Notebook Menu Popover Dropdown */}
            {isNotebookMenuOpen && (
              <div className="notebook-menu-popover">
                <div className="menu-popover-header">
                  <span className="menu-popover-title">Seus Cadernos ({allNotebooks.length})</span>
                  {onOpenCreateModal && (
                    <button
                      onClick={() => {
                        setIsNotebookMenuOpen(false);
                        onOpenCreateModal();
                      }}
                      className="add-page-btn"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                      title="Criar novo caderno"
                    >
                      <Plus size={12} />
                      <span>Novo</span>
                    </button>
                  )}
                </div>

                <div className="menu-popover-list">
                  {allNotebooks.map((nb) => {
                    const isActive = nb.id === notebook.id;
                    return (
                      <button
                        key={nb.id}
                        onClick={() => {
                          onSelectNotebook(nb.id);
                          setIsNotebookMenuOpen(false);
                        }}
                        className={`menu-notebook-item ${isActive ? 'active' : ''}`}
                      >
                        <div
                          className="mini-book-badge"
                          style={{
                            backgroundColor: nb.cover.color,
                            width: '20px',
                            height: '28px',
                          }}
                        />
                        <div className="menu-item-info">
                          <div className="menu-item-title">{nb.title}</div>
                          <div className="menu-item-subtitle">
                            {nb.pages.length} págs • {nb.subject}
                          </div>
                        </div>
                        {isActive && (
                          <Check size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="menu-popover-footer">
                  <button
                    onClick={() => {
                      setIsNotebookMenuOpen(false);
                      onOpenLibrary();
                    }}
                    className="menu-footer-btn"
                    title="Ver todos os cadernos na estante"
                  >
                    <BookOpen size={13} />
                    <span>Estante</span>
                  </button>

                  {onOpenCreateModal && (
                    <button
                      onClick={() => {
                        setIsNotebookMenuOpen(false);
                        onOpenCreateModal();
                      }}
                      className="menu-footer-btn primary"
                      title="Criar novo caderno personalizado"
                    >
                      <Plus size={13} />
                      <span>Criar Caderno</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Clean & Minimal Controls (Add Standard/Blank Page + Bookmarks) */}
        <div className="top-bar-center no-drag">
          {/* 1 page / 2 pages toggle (heart of the notebook) */}
          <button
            onClick={() => handleSetViewMode(viewMode === 'single' ? 'double' : 'single')}
            className={`top-btn-icon ${viewMode === 'double' ? 'active' : ''}`}
            title={viewMode === 'single' ? 'Abrir 2 páginas (caderno aberto)' : 'Voltar para 1 página (modo compacto)'}
          >
            {viewMode === 'single' ? <Columns2 size={14} /> : <Square size={14} />}
          </button>

          {/* Add Page: Padrão (estilo predefinido na criação) */}
          <button
            onClick={() => handleAddNewPage(notebook.paperPattern || 'ruled')}
            className="add-page-btn"
            title={`Adicionar nova página padrão (${notebook.paperPattern || 'pautada'})`}
          >
            <FileText size={12} />
            <span>+ Padrão</span>
          </button>

          {/* Add Page: Em Branco (lisa) */}
          <button
            onClick={() => handleAddNewPage('blank')}
            className="add-page-btn"
            title="Adicionar nova página em branco"
          >
            <Plus size={12} />
            <span>+ Branco</span>
          </button>

          {/* Bookmarks Trigger Button */}
          <button
            onClick={() => {
              if (isBookmarkMenuOpen) {
                setIsBookmarkMenuOpen(false);
              } else {
                openBookmarkMenu();
              }
            }}
            className={`top-btn-icon ${currentBookmark ? 'active' : ''}`}
            title={currentBookmark ? `Página marcada: "${currentBookmark.title}" (Shift + ↓ para gerenciar)` : `Marcadores (${bookmarks.length}) - Atalho: Shift + ↓`}
            style={currentBookmark ? { color: currentBookmark.color, borderColor: currentBookmark.color } : {}}
          >
            <BookmarkIcon size={14} fill={currentBookmark ? currentBookmark.color : 'none'} />
          </button>
        </div>

        {/* Right: Floating Window Controls (Pin, Opacity, Expand, Minimize, Hide) */}
        <div className="top-bar-right no-drag">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="top-btn-icon"
            title={isDarkMode ? 'Mudar para Caderno Claro' : 'Mudar para Caderno Escuro'}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Opacity Control */}
          <button
            onClick={handleCycleOpacity}
            className={`top-btn-icon ${windowOpacity < 1.0 ? 'active' : ''}`}
            title={`Opacidade do Caderno: ${Math.round(windowOpacity * 100)}% (Clique para alternar transparência)`}
          >
            <Eye size={14} />
          </button>

          {/* Electron Always-On-Top Pin Toggle */}
          <button
            onClick={handleTogglePin}
            className={`top-btn-icon ${isAlwaysOnTop ? 'active' : ''}`}
            title={isAlwaysOnTop ? 'Caderno Fixado no Topo (Flutuando sobre outras janelas)' : 'Caderno em Plano Padrão'}
          >
            <Pin size={14} />
          </button>

          {/* Tools Palette Toggle Button (Always accessible) */}
          <button
            onClick={() => {
              if (onToggleTools) {
                onToggleTools();
              } else {
                setIsToolsOpen((prev) => !prev);
              }
              if (window.electronAPI?.toggleToolsWindow) {
                window.electronAPI.toggleToolsWindow().catch(() => {});
              }
            }}
            className={`top-btn-icon ${(isToolsVisible ?? isToolsOpen) ? 'active' : ''}`}
            title={(isToolsVisible ?? isToolsOpen) ? 'Ocultar Barra de Ferramentas (Clique para esconder)' : 'Exibir Barra de Ferramentas (Clique para abrir canetas, cores e tamanhos)'}
          >
            <Palette size={14} />
          </button>

          {/* Desktop Minimize & Hide Controls */}
          {isElectron && (
            <>
              <button
                onClick={handleMinimize}
                className="top-btn-icon"
                title="Minimizar janela"
              >
                <Minus size={13} />
              </button>

              <button
                onClick={handleHideToTray}
                className="top-btn-icon close-btn"
                title="Ocultar para a bandeja (Pressione Ctrl+Alt+N para reabrir instantaneamente)"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Notebook Canvas Area */}
      <main className="notebook-stage">
        {/* Previous Page Arrow */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="nav-arrow-btn prev"
          title="Página anterior (ou use ←)"
        >
          <ChevronLeft size={20} />
        </button>

        {/* The Open Notebook Frame with Dynamic Cover Border Color */}
        <div 
          className={`open-notebook-frame ${spreadClass} ${themeClass}`}
          style={{ backgroundColor: activeCoverColor }}
        >
          {/* Ribbon Bookmark Tabs dangling from top edge */}
          {bookmarks.length > 0 && (
            <div className="ribbon-bookmarks-bar">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => setCurrentPage(bm.pageNumber)}
                  className={`ribbon-bookmark-tab ${bm.pageNumber === currentPage ? 'active' : ''}`}
                  title={bm.title ? `${bm.title} (Página ${bm.pageNumber})` : `Marcador na Página ${bm.pageNumber}`}
                >
                  <div className="ribbon-body" style={{ backgroundColor: bm.color }} />
                  <span className="ribbon-number">{bm.pageNumber}</span>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'double' ? (
            <>
              {/* Left Page Leaf */}
              {leftPage ? (
                <NotebookPage
                  page={leftPage}
                  side="left"
                  totalPages={totalPages}
                  activeTool={activeTool}
                  brushColor={isDarkMode && brushColor === '#18181b' ? '#ffffff' : brushColor}
                  brushSize={brushSize}
                  fontFamily={notebook.fontFamily}
                  fontScale={notebook.fontScale || 1}
                  shapeKind={shapeKind}
                  shapeFill={shapeFill}
                  lineCount={notebook.lineCount || 16}
                  paperColor={isDarkMode ? 'dark' : (notebook.paperColor || 'cream')}
                  paperPattern={leftPage.paperPattern || notebook.paperPattern || 'ruled'}
                  onUpdatePage={updatePage}
                  onDeletePage={handleDeletePage}
                  onPrevPage={handlePrevPage}
                  onSelectTypeTool={() => onChangeTool?.('type')}
                  onPageOverflow={handlePageOverflow}
                />
              ) : (
                <div className="page-leaf-base page-leaf-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                  Início
                </div>
              )}

              {/* Center Crease */}
              <div className="center-spine-line" />

              {/* Right Page Leaf */}
              {rightPage ? (
                <NotebookPage
                  page={rightPage}
                  side="right"
                  totalPages={totalPages}
                  activeTool={activeTool}
                  brushColor={isDarkMode && brushColor === '#18181b' ? '#ffffff' : brushColor}
                  brushSize={brushSize}
                  fontFamily={notebook.fontFamily}
                  fontScale={notebook.fontScale || 1}
                  shapeKind={shapeKind}
                  shapeFill={shapeFill}
                  lineCount={notebook.lineCount || 16}
                  paperColor={isDarkMode ? 'dark' : (notebook.paperColor || 'cream')}
                  paperPattern={rightPage.paperPattern || notebook.paperPattern || 'ruled'}
                  onUpdatePage={updatePage}
                  onDeletePage={handleDeletePage}
                  onNextPage={handleNextPage}
                  onSelectTypeTool={() => onChangeTool?.('type')}
                  onPageOverflow={handlePageOverflow}
                />
              ) : (
                <div className="page-leaf-base page-leaf-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: 0.6 }}>
                  <p style={{ fontSize: '0.82rem' }}>Final do caderno.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleAddNewPage(notebook.paperPattern || 'ruled')} className="add-page-btn">
                      + Padrão
                    </button>
                    <button onClick={() => handleAddNewPage('blank')} className="add-page-btn">
                      + Branco
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Single Page Compact View */
            singlePage ? (
              <NotebookPage
                page={singlePage}
                side="single"
                totalPages={totalPages}
                activeTool={activeTool}
                brushColor={isDarkMode && brushColor === '#18181b' ? '#ffffff' : brushColor}
                brushSize={brushSize}
                fontFamily={notebook.fontFamily}
                fontScale={notebook.fontScale || 1}
                shapeKind={shapeKind}
                shapeFill={shapeFill}
                lineCount={notebook.lineCount || 16}
                paperColor={isDarkMode ? 'dark' : (notebook.paperColor || 'cream')}
                paperPattern={singlePage.paperPattern || notebook.paperPattern || 'ruled'}
                onUpdatePage={updatePage}
                onDeletePage={handleDeletePage}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                onSelectTypeTool={() => onChangeTool?.('type')}
                onPageOverflow={handlePageOverflow}
              />
            ) : null
          )}
        </div>

        {/* Next Page Arrow */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="nav-arrow-btn next"
          title="Próxima página (ou use →)"
        >
          <ChevronRight size={20} />
        </button>
      </main>

      {/* Global Shortcut Help Modal */}
      {showShortcutModal && (
        <div className="shortcut-modal-overlay" onClick={() => setShowShortcutModal(false)}>
          <div className="shortcut-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="shortcut-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Keyboard size={18} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Atalhos Rápidos do NotBooks</h3>
              </div>
              <button 
                onClick={() => setShowShortcutModal(false)}
                className="top-btn-icon"
                style={{ padding: '4px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="shortcut-modal-body">
              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>N</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Atalho Global no Windows:</strong> Abre ou oculta o caderno flutuante instantaneamente sobre qualquer aplicação principal.
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>T</kbd> / <kbd>P</kbd> / <kbd>L</kbd> / <kbd>H</kbd> / <kbd>E</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Troca Rápida de Ferramentas:</strong> <strong>T</strong>exto, <strong>P</strong>en (Caneta), <strong>L</strong>ápis, <strong>H</strong>ighlighter (Marca-texto), <strong>E</strong>raser (Borracha).
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>[</kbd> e <kbd>]</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Espessura do Traço:</strong> Diminui ou aumenta o calibre da caneta/lápis rapidamente.
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>Shift</kbd> + <kbd>↑</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Barra de Ferramentas:</strong> Exibe ou oculta a barra flutuante de ferramentas de escrita e desenho.
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>Shift</kbd> + <kbd>↓</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Marcador de Página:</strong> Abre o painel para escolher a cor da fita e definir um nome guia para marcar esta página.
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>Shift</kbd> + <kbd>→</kbd> / <kbd>←</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Navegação Inteligente de Páginas:</strong> No modo de 2 páginas, avança o cursor da 1ª folha para a 2ª, ou vira a página do caderno se já estiver na 2ª folha. No modo de 1 página, vira para a próxima ou anterior.
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>Enter</kbd> (no fim da página)
                </div>
                <div className="shortcut-desc">
                  <strong>Salto Automático:</strong> Ao atingir o limite de linhas da folha, pula automaticamente para a próxima página sem rolagem infinita.
                </div>
              </div>

              <div className="shortcut-item-row">
                <div className="shortcut-keys">
                  <kbd>Esc</kbd>
                </div>
                <div className="shortcut-desc">
                  <strong>Ocultar Rapidamente:</strong> Pressione Esc para ocultar o caderno e voltar imediatamente à sua aplicação principal.
                </div>
              </div>
            </div>

            <div className="shortcut-modal-footer">
              <button
                onClick={() => setShowShortcutModal(false)}
                className="shortcut-modal-close-btn"
              >
                Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Centered Modal (Never off-screen or poorly dimensioned) */}
      {isBookmarkMenuOpen && (
        <div 
          className="bookmark-modal-overlay"
          onClick={() => setIsBookmarkMenuOpen(false)}
        >
          <div
            ref={bookmarkRef}
            className="bookmark-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bookmark-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookmarkIcon size={16} style={{ color: selectedRibbonColor }} fill={selectedRibbonColor} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  {currentBookmark ? `Editar Marcador (Pág. ${currentPage})` : `Novo Marcador (Pág. ${currentPage})`}
                </span>
              </div>
              <button
                onClick={() => setIsBookmarkMenuOpen(false)}
                className="bookmark-modal-close"
                title="Fechar (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Bookmark Title Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              <label style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
                Nome do Marcador:
              </label>
              <input
                ref={bookmarkInputRef}
                type="text"
                value={bookmarkTitleInput}
                onChange={(e) => setBookmarkTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveBookmark();
                  }
                }}
                placeholder="Ex: Resumo de Física, Anotação importante..."
                className="bookmark-modal-input"
              />
            </div>

            {/* Color choices for ribbon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
                Cor da Fita:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {RIBBON_COLORS.map((c) => (
                  <div
                    key={c.color}
                    onClick={() => setSelectedRibbonColor(c.color)}
                    title={c.name}
                    className={`bookmark-color-circle ${selectedRibbonColor === c.color ? 'active' : ''}`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                onClick={handleSaveBookmark}
                className="bookmark-modal-save-btn"
              >
                <Check size={14} />
                <span>{currentBookmark ? 'Salvar Marcador' : '+ Adicionar Marcador'}</span>
              </button>

              {currentBookmark && (
                <button
                  onClick={(e) => {
                    handleDeleteBookmark(currentBookmark.id, e);
                    setIsBookmarkMenuOpen(false);
                  }}
                  className="bookmark-modal-delete-btn"
                  title="Excluir marcador desta página"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* List of bookmarks */}
            <div className="bookmark-modal-list-section">
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, marginBottom: '6px' }}>
                Todos os Marcadores ({bookmarks.length}):
              </div>
              <div className="bookmark-modal-list">
                {bookmarks.length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', textAlign: 'center', padding: '0.6rem 0' }}>
                    Nenhum marcador criado ainda. Pressione <strong>Enter</strong> para criar!
                  </div>
                ) : (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onClick={() => {
                        setCurrentPage(bm.pageNumber);
                        setIsBookmarkMenuOpen(false);
                      }}
                      className={`bookmark-item-btn ${bm.pageNumber === currentPage ? 'current' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '10px',
                            height: '14px',
                            backgroundColor: bm.color,
                            borderRadius: '2px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bm.title || `Página ${bm.pageNumber}`}
                          </div>
                          <div style={{ fontSize: '0.66rem', opacity: 0.6 }}>
                            Página {bm.pageNumber}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteBookmark(bm.id, e)}
                        title="Remover este marcador"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
