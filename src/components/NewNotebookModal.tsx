import React, { useState } from 'react';
import type { Notebook, PaperPattern, PaperColor, FontHandwriting } from '../types/notebook';
import { Book, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface NewNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (notebook: Notebook) => void;
}

export const NewNotebookModal: React.FC<NewNotebookModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [coverColor, setCoverColor] = useState('#1b3b2b');
  const [paperPattern, setPaperPattern] = useState<PaperPattern>('ruled');
  const [paperColor, setPaperColor] = useState<PaperColor>('cream');
  const [fontFamily, setFontFamily] = useState<FontHandwriting>('Caveat');
  const [lineCount, setLineCount] = useState<number>(16);

  if (!isOpen) return null;

  const COVERS = [
    { label: 'Verde Floresta (Couro)', color: '#1b3b2b' },
    { label: 'Azul Meia-Noite', color: '#1e3a8a' },
    { label: 'Bordô Clássico', color: '#581c87' },
    { label: 'Terracota / Conhaque', color: '#7c2d12' },
    { label: 'Ardósia Escura', color: '#1e293b' },
    { label: 'Preto Obsidiana', color: '#09090b' },
  ];

  const PATTERNS: { id: PaperPattern; label: string; desc: string }[] = [
    { id: 'ruled', label: 'Pautado', desc: 'Linhas clássicas' },
    { id: 'grid', label: 'Quadriculado', desc: 'Exatas e diagramas' },
    { id: 'dotted', label: 'Pontilhado', desc: 'Bullet journal' },
    { id: 'cornell', label: 'Cornell', desc: 'Resumo com coluna' },
    { id: 'blank', label: 'Em Branco', desc: 'Liso e livre' },
  ];

  const PAPER_COLORS: { id: PaperColor; label: string; hex: string; desc: string }[] = [
    { id: 'cream', label: 'Marfim', hex: '#fbf8ee', desc: 'Aconchegante clássico' },
    { id: 'white', label: 'Branco Puro', hex: '#ffffff', desc: 'Nítido e moderno' },
    { id: 'sepia', label: 'Sépia', hex: '#f4ecd8', desc: 'Vintage livro antigo' },
    { id: 'dark', label: 'Noturno', hex: '#181b20', desc: 'Ardósia escuro' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newBook: Notebook = {
      id: `nb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      subject: subject.trim() || 'Anotações Gerais',
      cover: {
        color: coverColor,
        texture: 'leather',
        embossing: 'gold',
        accentColor: '#d4af37',
      },
      paperPattern,
      paperColor,
      fontFamily,
      lineCount,
      currentPage: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bookmarks: [],
      pages: [
        {
          id: `p-${Date.now()}-1`,
          pageNumber: 1,
          paperPattern,
          textContent: `Bem-vindo ao seu novo caderno "${title.trim()}"!\n\nComece a escrever suas anotações ou use Ctrl+V para colar imagens diretamente na folha.`,
          strokes: [],
          images: [],
          updatedAt: Date.now(),
        },
        {
          id: `p-${Date.now()}-2`,
          pageNumber: 2,
          paperPattern,
          textContent: '',
          strokes: [],
          images: [],
          updatedAt: Date.now(),
        },
      ],
    };

    sound.playBookOpen();
    onCreate(newBook);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        <div className="modal-header-row" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
          <div className="brand-icon-box" style={{ padding: '0.5rem' }}>
            <Book size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Criar Novo Caderno</h2>
            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Escolha a capa, o papel e a caligrafia com visualização ao vivo</p>
          </div>
        </div>

        {/* Live Preview do Caderno */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.25rem',
          }}
        >
          {/* Mini Caderno Aberto */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              maxWidth: '380px',
              height: '110px',
              borderRadius: '8px',
              padding: '6px',
              backgroundColor: coverColor,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              transition: 'all 0.3s',
            }}
          >
            {/* Folha Esquerda de Preview */}
            <div
              className={`paper-color-${paperColor} paper-pattern-${paperPattern}`}
              style={{
                flex: 1,
                borderRadius: '4px 0 0 4px',
                padding: '8px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div className="ruled-lines-layer" style={{ top: '8px', left: '8px', right: '8px', height: '80px', backgroundSize: paperPattern === 'grid' || paperPattern === 'dotted' ? '14px 14px' : '100% 18px' }} />
              <div style={{ position: 'relative', zIndex: 4, fontFamily, fontSize: '0.9rem', lineHeight: '18px', fontWeight: 600 }}>
                {title || 'Título do Caderno'}
              </div>
              <div style={{ position: 'relative', zIndex: 4, fontSize: '0.62rem', opacity: 0.6 }}>
                pág 1 • {lineCount} linhas
              </div>
            </div>

            {/* Vinco Central */}
            <div style={{ width: '2px', backgroundColor: 'rgba(0,0,0,0.35)', height: '100%' }} />

            {/* Folha Direita de Preview */}
            <div
              className={`paper-color-${paperColor} paper-pattern-${paperPattern}`}
              style={{
                flex: 1,
                borderRadius: '0 4px 4px 0',
                padding: '8px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div className="ruled-lines-layer" style={{ top: '8px', left: '8px', right: '8px', height: '80px', backgroundSize: paperPattern === 'grid' || paperPattern === 'dotted' ? '14px 14px' : '100% 18px' }} />
              <div style={{ position: 'relative', zIndex: 4, fontFamily, fontSize: '0.8rem', lineHeight: '18px', opacity: 0.85 }}>
                {subject || 'Anotações e ideias...'}
              </div>
              <div style={{ position: 'relative', zIndex: 4, fontSize: '0.62rem', opacity: 0.6, textAlign: 'right' }}>
                pág 2
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-grid-2">
            <div className="modal-form-group">
              <label className="modal-label">Título do Caderno</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Física, Diário, Finanças..."
                className="modal-input"
                required
                autoFocus
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Matéria / Assunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Geral, Semestre 2..."
                className="modal-input"
              />
            </div>
          </div>

          {/* Cover Color Selection */}
          <div className="modal-form-group">
            <label className="modal-label">Cor da Capa & Borda</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
              {COVERS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setCoverColor(c.color)}
                  title={c.label}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '0.6rem',
                    backgroundColor: c.color,
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transform: coverColor === c.color ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: coverColor === c.color ? '0 0 0 2px #f59e0b' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {coverColor === c.color && <Check size={16} color="#ffffff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tom do Papel com Amostras Visuais */}
          <div className="modal-form-group">
            <label className="modal-label">Cor da Folha de Papel</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {PAPER_COLORS.map((pc) => (
                <button
                  key={pc.id}
                  type="button"
                  onClick={() => setPaperColor(pc.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0.45rem',
                    borderRadius: '0.5rem',
                    backgroundColor: pc.hex,
                    color: pc.id === 'dark' ? '#f1f5f9' : '#1e293b',
                    border: paperColor === pc.id ? '2px solid #f59e0b' : '1px solid rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: paperColor === pc.id ? '0 0 0 2px rgba(245, 158, 11, 0.4)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>{pc.label}</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{pc.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Folha Padrão */}
          <div className="modal-form-group">
            <label className="modal-label">Pauta Padrão das Páginas</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperPattern(p.id)}
                  style={{
                    padding: '0.4rem 0.25rem',
                    borderRadius: '0.45rem',
                    backgroundColor: paperPattern === p.id ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: paperPattern === p.id ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                    color: paperPattern === p.id ? '#fbbf24' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-grid-2">
            <div className="modal-form-group">
              <label className="modal-label">Fonte da Escrita</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as FontHandwriting)}
                className="modal-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="Caveat" style={{ background: '#1c1f24' }}>Caveat (Cursiva)</option>
                <option value="Patrick Hand" style={{ background: '#1c1f24' }}>Patrick Hand (Escolar)</option>
                <option value="Indie Flower" style={{ background: '#1c1f24' }}>Indie Flower (Leve)</option>
                <option value="Kalam" style={{ background: '#1c1f24' }}>Kalam (Tinteiro)</option>
                <option value="Lora" style={{ background: '#1c1f24' }}>Lora (Serifada)</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Linhas por Página</label>
              <select
                value={lineCount}
                onChange={(e) => setLineCount(Number(e.target.value))}
                className="modal-input"
                style={{ cursor: 'pointer' }}
              >
                <option value={12} style={{ background: '#1c1f24' }}>12 Linhas (Espaçadas)</option>
                <option value={16} style={{ background: '#1c1f24' }}>16 Linhas (Padrão)</option>
                <option value={20} style={{ background: '#1c1f24' }}>20 Linhas (Médias)</option>
                <option value={24} style={{ background: '#1c1f24' }}>24 Linhas (Compactas)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer-row" style={{ marginTop: '1.25rem', paddingTop: '0.85rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="btn-new-book"
            >
              Criar Caderno
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
