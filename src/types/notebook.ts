export type PaperPattern = 'ruled' | 'grid' | 'dotted' | 'blank' | 'cornell';

export type PaperColor = 'cream' | 'white' | 'sepia' | 'dark';

export type FontHandwriting = 'Caveat' | 'Patrick Hand' | 'Indie Flower' | 'Kalam' | 'Lora';

export type ToolType = 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'type' | 'shape';

export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'shape';
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  shape?: ShapeKind; // for tool === 'shape': points[0] = start, last point = end
  fill?: boolean; // for tool === 'shape': fill with color or outline only
}

export interface Bookmark {
  id: string;
  pageNumber: number; // 1-indexed
  title: string;
  color: string;
  createdAt: number;
}

export interface PageImage {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Page {
  id: string;
  pageNumber: number; // 1-indexed
  paperPattern?: PaperPattern; // override notebook default if set
  textContent: string;
  strokes: Stroke[];
  images?: PageImage[];
  updatedAt: number;
}

export interface NotebookCover {
  color: string;
  texture: 'leather' | 'cloth' | 'hardcover' | 'minimal' | 'vintage';
  embossing?: string; // e.g., gold, silver, blind
  accentColor?: string;
}

export interface Notebook {
  id: string;
  title: string;
  subject: string; // e.g. "Física Teórica", "Cálculo", "Diário de Ideias"
  cover: NotebookCover;
  paperPattern: PaperPattern;
  paperColor: PaperColor;
  fontFamily: FontHandwriting;
  fontScale?: number; // writing size multiplier (0.7 - 1.6), default 1
  lineCount?: number; // Number of fixed lines per page (e.g. 12, 16, 20, 24)
  pages: Page[];
  bookmarks: Bookmark[];
  currentPage: number; // 1-indexed
  createdAt: number;
  updatedAt: number;
}
