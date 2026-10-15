# 📓 NotBooks - Caderno Digital Flutuante para Desktop

Um aplicativo de caderno digital realista e minimalista, desenvolvido para funcionar como um companheiro secundário flutuante enquanto você usa sua aplicação principal (estudos, navegação, vídeos, programação ou jogos).

---

## ⚡ Atalhos Rápidos e Teclas de Ação

| Atalho / Ação | O que faz |
| :--- | :--- |
| **`Ctrl + Alt + N`** | **Atalho Global no Windows:** Abre ou oculta o caderno instantaneamente de qualquer lugar, mesmo com outro app em tela cheia! |
| **`Ctrl + Shift + Espaço`** | **Atalho Global Alternativo:** Invocação rápida de uma mão só. |
| **`Esc`** | Oculta o caderno e retorna imediatamente para a sua aplicação principal. |
| **Arrastar no Topo** | Clique e segure no topo da barra para reposicionar o caderno livremente na tela. |
| **📌 Fixar (Pin)** | Mantém o caderno sempre flutuando no topo sobre todas as janelas. |
| **🗗 Modo Compacto (1 Pág)** | Reduz a janela para o formato de bloco flutuante compacto (ideal para canto de tela). |
| **👁️ Opacidade** | Alterna entre 100%, 88% e 72% de opacidade para você conseguir enxergar o conteúdo por trás. |
| **Bandeja do Sistema (Tray)** | Fica silencioso ao lado do relógio do Windows com menu de contexto. |

---

## 🚀 Como Iniciar o Aplicativo

### Modo Aplicativo Desktop (Desenvolvimento com Hot-Reload):
```bash
npm run desktop
```
> Isso inicia o Vite e o Electron simultaneamente. O caderno já abrirá flutuando na sua tela!

### Modo Aplicativo Desktop Produção / Pré-visualização:
```bash
npm run desktop:preview
```

### Modo Web Tradicional (no navegador):
```bash
npm run dev
```

---

## 💡 Recursos do Caderno

- **Páginas com Linhas ou em Branco:** Alterne a quantidade de pautas (12, 16, 20 ou 24 linhas por página) para escrever sem esticar a página.
- **Canetas, Lápis, Marca-Texto e Borracha:** Com traços realistas via `perfect-freehand`.
- **Modo Texto com Fontes Manuscritas:** *Caveat*, *Patrick Hand*, *Indie Flower*, *Kalam* e *Lora*.
- **Caderno Claro e Escuro:** Alterne o tema de acordo com sua iluminação de trabalho.
