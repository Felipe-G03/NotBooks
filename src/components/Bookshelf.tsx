import React, { useState } from 'react';
import type { Notebook } from '../types/notebook';
import { Plus, BookOpen, Trash2, Search, Sparkles, Feather, ArrowRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface BookshelfProps {
  notebooks: Notebook[];
  onSelectNotebook: (notebook: Notebook) => void;
  onDeleteNotebook: (id: string) => void;
  onOpenCreateModal: () => void;
  onCloseLibrary?: () => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({
  notebooks,
  onSelectNotebook,
  onDeleteNotebook,
  onOpenCreateModal,
  onCloseLibrary,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = notebooks.filter(
    (nb) =>
      nb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nb.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpen = (nb: Notebook) => {
    sound.playBookOpen();
    onSelectNotebook(nb);
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja apagar o caderno "${title}"?`)) {
      onDeleteNotebook(id);
    }
  };

  return (
    <div className="bookshelf-wrapper">
      {/* Header */}
      <header className="bookshelf-header">
        <div className="bookshelf-brand">
          <div className="brand-icon-box">
            <Feather size={24} />
          </div>
          <div>
            <h1 className="brand-title">
              <span>NotBooks</span>
              <span className="brand-badge">Biblioteca</span>
            </h1>
            <p className="brand-subtitle">
              Seus cadernos com capas e estilos personalizados
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bookshelf-controls">
          {onCloseLibrary && (
            <button
              onClick={onCloseLibrary}
              className="btn-back-library"
            >
              ← Voltar ao Caderno
            </button>
          )}

          <div className="search-box-wrapper">
            <Search size={15} className="search-box-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cadernos..."
              className="search-box-input"
            />
          </div>

          <button onClick={onOpenCreateModal} className="btn-new-book">
            <Plus size={16} />
            <span>Novo Caderno</span>
          </button>
        </div>
      </header>

      {/* Main Bookshelf Grid */}
      <main className="bookshelf-main">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.6 }}>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Nenhum caderno encontrado.</p>
            <button onClick={onOpenCreateModal} className="btn-new-book" style={{ margin: '0 auto' }}>
              <Plus size={14} />
              <span>Criar Primeiro Caderno</span>
            </button>
          </div>
        ) : (
          <div className="books-grid">
            {filtered.map((nb) => (
              <div
                key={nb.id}
                onClick={() => handleOpen(nb)}
                className="notebook-card"
                style={{ backgroundColor: nb.cover.color }}
              >
                {/* 3D Spine and stitched seams */}
                <div className="notebook-spine" />
                <div className="notebook-stitch-line" />

                {/* Bookmark ribbons peeking out of the top */}
                {nb.bookmarks.length > 0 && (
                  <div className="ribbon-cluster">
                    {nb.bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        title={`Fita: ${bm.title} (Pág. ${bm.pageNumber})`}
                        className="ribbon-flag"
                        style={{ backgroundColor: bm.color }}
                      />
                    ))}
                  </div>
                )}

                {/* Cover Header */}
                <div className="notebook-cover-content">
                  <div className="notebook-subject-tag">
                    <Sparkles size={11} />
                    <span>{nb.subject}</span>
                  </div>

                  <h2 className="notebook-title">
                    {nb.title}
                  </h2>

                  <div className="notebook-divider" />
                </div>

                {/* Center Emblem */}
                <div className="notebook-emblem">
                  <div className="emblem-circle">
                    <BookOpen size={30} />
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="notebook-card-footer">
                  <div className="notebook-meta-stats">
                    {nb.pages.length} págs • {nb.bookmarks.length} fitas
                  </div>

                  <div className="notebook-action-group">
                    <button
                      onClick={(e) => handleDelete(e, nb.id, nb.title)}
                      title="Apagar este caderno"
                      className="btn-icon-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="btn-open-label">
                      <span>Abrir</span>
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bookshelf-footer">
        <div>NotBooks • Compatível nativamente com Windows e Linux</div>
        <div>Armazenamento 100% Local • Totalmente Offline</div>
      </footer>
    </div>
  );
};
