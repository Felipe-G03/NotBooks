import type { Notebook } from '../types/notebook';

const STORAGE_KEY = 'notbooks_library_v2';

export const INITIAL_NOTEBOOKS: Notebook[] = [
  {
    id: 'nb-fisica',
    title: 'Física I - Mecânica & Órbitas',
    subject: 'Física Geral e Experimental',
    cover: {
      color: '#dc2626', // Classic Red Hardcover (matching user's reference mockup)
      texture: 'hardcover',
      embossing: 'silver',
      accentColor: '#ffffff',
    },
    paperPattern: 'ruled',
    paperColor: 'white',
    fontFamily: 'Caveat',
    currentPage: 1,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000,
    bookmarks: [
      {
        id: 'bm-gravitacao',
        pageNumber: 1,
        title: 'Gravitação Universal',
        color: '#dc2626',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'bm-colisoes',
        pageNumber: 3,
        title: 'Conservação de Energia',
        color: '#f59e0b',
        createdAt: Date.now() - 86400000,
      },
    ],
    pages: [
      {
        id: 'p-fis-1',
        pageNumber: 1,
        paperPattern: 'ruled',
        textContent: `LEIS DA GRAVITAÇÃO UNIVERSAL & ÓRBITAS

A força gravitacional entre dois corpos de massas M e m é diretamente proporcional ao produto de suas massas e inversamente proporcional ao quadrado da distância que os separa.

F = G * (M * m) / r²

Onde G = 6.674 × 10⁻¹¹ N·m²/kg²

• Primeira Lei de Kepler: Os planetas descrevem órbitas elípticas em torno do Sol, que ocupa um dos focos da elipse.
• Segunda Lei (Lei das Áreas): O segmento de reta que une o Sol ao planeta varre áreas iguais em intervalos de tempo iguais. (dA/dt = L / 2m = constante)

Nota de revisão: revisar a velocidade de escape no periélio!`,
        strokes: [
          // Simulated diagram: ellipse and orbit arrow
          {
            id: 'st-sun',
            tool: 'pen',
            color: '#b45309',
            size: 3,
            opacity: 1,
            points: [
              { x: 380, y: 310, pressure: 0.8 },
              { x: 390, y: 315, pressure: 0.9 },
              { x: 385, y: 325, pressure: 0.7 },
              { x: 375, y: 320, pressure: 0.6 },
              { x: 380, y: 310, pressure: 0.8 },
            ]
          },
          // Orbit curve
          {
            id: 'st-orbit',
            tool: 'pencil',
            color: '#2563eb',
            size: 2,
            opacity: 0.85,
            points: [
              { x: 260, y: 320, pressure: 0.5 },
              { x: 310, y: 280, pressure: 0.6 },
              { x: 400, y: 275, pressure: 0.7 },
              { x: 490, y: 310, pressure: 0.6 },
              { x: 520, y: 350, pressure: 0.5 },
              { x: 460, y: 390, pressure: 0.6 },
              { x: 360, y: 395, pressure: 0.7 },
              { x: 280, y: 365, pressure: 0.5 },
              { x: 260, y: 320, pressure: 0.5 },
            ]
          },
          // Yellow highlighter on Kepler's law
          {
            id: 'st-hl-1',
            tool: 'highlighter',
            color: '#fef08a',
            size: 18,
            opacity: 0.45,
            points: [
              { x: 45, y: 335, pressure: 0.9 },
              { x: 220, y: 335, pressure: 0.9 },
            ]
          },
          // Red marker circle around formula
          {
            id: 'st-formula-box',
            tool: 'pen',
            color: '#dc2626',
            size: 2,
            opacity: 0.9,
            points: [
              { x: 40, y: 175, pressure: 0.7 },
              { x: 290, y: 172, pressure: 0.8 },
              { x: 295, y: 215, pressure: 0.7 },
              { x: 38, y: 218, pressure: 0.6 },
              { x: 40, y: 175, pressure: 0.7 },
            ]
          }
        ],
        updatedAt: Date.now() - 3600000,
      },
      {
        id: 'p-fis-2',
        pageNumber: 2,
        paperPattern: 'ruled',
        textContent: `ENERGIA POTENCIAL GRAVITACIONAL & VELOCIDADE DE ESCAPE

Diferente do caso próximo à superfície terrestre (Ep = mgh), para distâncias astronômicas adotamos o infinito como referencial de energia nula:

U(r) = - G * (M * m) / r

Velocidade de Escape:
Para um projétil escapar completamente do campo gravitacional de um astro de massa M e raio R:
Emec = 0  =>  (1/2) * m * v_esc² - G*(M*m)/R = 0
v_esc = √( 2 * G * M / R )

Para a Terra:
v_esc ≈ 11.2 km/s (aproximadamente 40.320 km/h)

Importante: A velocidade de escape independe da massa m do objeto que está escapando!`,
        strokes: [
          {
            id: 'st-p2-hl',
            tool: 'highlighter',
            color: '#bbf7d0', // Green pastel highlighter
            size: 18,
            opacity: 0.45,
            points: [
              { x: 45, y: 415, pressure: 0.8 },
              { x: 530, y: 415, pressure: 0.8 },
            ]
          }
        ],
        updatedAt: Date.now() - 7200000,
      },
      {
        id: 'p-fis-3',
        pageNumber: 3,
        paperPattern: 'grid',
        textContent: `EXERCÍCIOS RESOLVIDOS - CAMPO & FORÇA

Exercício 1: Calcule a aceleração da gravidade a uma altitude igual ao raio da Terra (h = R).

Solução:
g(r) = G * M / r²
Aqui, r = R + h = 2R
g(2R) = G * M / (2R)² = (1/4) * (G * M / R²) = g₀ / 4
Como g₀ ≈ 9.8 m/s²:
g ≈ 9.8 / 4 = 2.45 m/s²

Conclusão: A 6.370 km de altitude, o peso de um corpo cai para 25% do valor na superfície!`,
        strokes: [
          {
            id: 'st-check',
            tool: 'pen',
            color: '#16a34a', // Green ink checkmark
            size: 3,
            opacity: 1,
            points: [
              { x: 260, y: 345, pressure: 0.6 },
              { x: 275, y: 360, pressure: 0.9 },
              { x: 300, y: 330, pressure: 0.8 },
            ]
          }
        ],
        updatedAt: Date.now() - 10000000,
      },
      {
        id: 'p-fis-4',
        pageNumber: 4,
        paperPattern: 'ruled',
        textContent: `ANOTAÇÕES LIVRES

[Escreva ou desenhe aqui livremente...]`,
        strokes: [],
        updatedAt: Date.now(),
      }
    ]
  },
  {
    id: 'nb-ideias',
    title: 'Caderno de Ideias & Projetos',
    subject: 'Inovações, Engenharia & Design',
    cover: {
      color: '#7c2d12', // Warm amber / terracotta leather
      texture: 'vintage',
      embossing: 'gold',
      accentColor: '#fbbf24',
    },
    paperPattern: 'dotted',
    paperColor: 'cream',
    fontFamily: 'Patrick Hand',
    currentPage: 1,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 4000000,
    bookmarks: [
      {
        id: 'bm-notbooks-concept',
        pageNumber: 1,
        title: 'Conceito NotBooks',
        color: '#3b82f6', // Blue ribbon
        createdAt: Date.now() - 86400000 * 4,
      }
    ],
    pages: [
      {
        id: 'p-id-1',
        pageNumber: 1,
        paperPattern: 'dotted',
        textContent: `PROJETO: APLICATIVO NOTBOOKS

Objetivo: Criar uma experiência de anotações que resgate a sensação orgânica, tátil e afetiva de um caderno real.

Diferenciais fundamentais:
• Sem rolagem infinita: limite físico de páginas (respeito à geometria espacial).
• Virada de folha realista (efeito página 3D com curvatura e som de papel).
• Lápis, nanquim e marca-texto com desenho livre sobre o texto digitado.
• Fitas marcadoras de cetim para navegar sem burocracia de pastas.
• Suporte nativo tanto para Windows quanto Linux.`,
        strokes: [
          {
            id: 'st-star',
            tool: 'pen',
            color: '#d97706',
            size: 3,
            opacity: 1,
            points: [
              { x: 420, y: 150, pressure: 0.7 },
              { x: 440, y: 190, pressure: 0.8 },
              { x: 395, y: 165, pressure: 0.7 },
              { x: 445, y: 165, pressure: 0.7 },
              { x: 400, y: 190, pressure: 0.8 },
              { x: 420, y: 150, pressure: 0.7 },
            ]
          }
        ],
        updatedAt: Date.now() - 4000000,
      },
      {
        id: 'p-id-2',
        pageNumber: 2,
        paperPattern: 'blank',
        textContent: `ESBOÇOS E DIAGRAMAS

Página em branco para desenhos geométricos, plantas e anotações visuais.`,
        strokes: [],
        updatedAt: Date.now(),
      }
    ]
  },
  {
    id: 'nb-diario',
    title: 'Diário de Bordo & Pensamentos',
    subject: 'Reflexões Pessoais',
    cover: {
      color: '#1e293b', // Midnight slate
      texture: 'cloth',
      embossing: 'silver',
      accentColor: '#94a3b8',
    },
    paperPattern: 'ruled',
    paperColor: 'sepia',
    fontFamily: 'Kalam',
    currentPage: 1,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 20000000,
    bookmarks: [],
    pages: [
      {
        id: 'p-dia-1',
        pageNumber: 1,
        paperPattern: 'ruled',
        textContent: `14 de Outubro - O silêncio do papel

Escrever à mão, mesmo através de uma caneta digital ou do cursor, nos obriga a desacelerar. O pensamento flui em outro ritmo quando não há pop-ups, nem listas intermináveis de notificações.

Um bom caderno é um abrigo para a mente.`,
        strokes: [],
        updatedAt: Date.now() - 20000000,
      }
    ]
  }
];

export function loadLibrary(): Notebook[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load notebooks from storage:', err);
  }
  return INITIAL_NOTEBOOKS;
}

export function saveLibrary(notebooks: Notebook[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
  } catch (err) {
    console.error('Failed to save notebooks to storage:', err);
  }
}
