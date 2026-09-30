# 🐍 Snake — Meu Primeiro Jogo

Jogo da cobrinha clássico, feito do zero com **HTML, CSS e JavaScript puros**.
Sem frameworks, sem dependências, sem build. Só código.

![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat&logo=css3&logoColor=white)
![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=white)

## ✨ Recursos

| Recurso | Descrição |
| --- | --- |
| 🏆 Contador de pontos | +10 por fruta, com animação de *pop* no placar |
| 💾 Recorde | Salvo no `localStorage` e exibido no HUD |
| 💥 Efeito ao comer | Partículas em duas cores, flash dourado e *screen shake* no tabuleiro |
| 💀 Game over | Tela com pontuação final, botão **Reiniciar** e destaque de novo recorde |
| ⏸️ Pausa | Tecla `Espaço` — congela a partida sem perder o estado |
| ⚡ Níveis | A cada 50 pontos a cobra fica mais rápida (até o nível 8) |
| 📱 Celular | Controles D-pad na tela + gestos de *swipe* |
| 🎮 Visual | Grade escura, gradientes na cobra, olhos que olham para a direção e fruta pulsante |

## 🕹️ Controles

| Ação | Teclado | Celular |
| --- | --- | --- |
| Mover | `↑` `↓` `←` `→` ou `W` `A` `S` `D` | D-pad na tela ou swipe |
| Pausar / continuar | `Espaço` | — |
| Reiniciar | `R` | Botão na tela de game over |
| Começar | `Enter` | Botão **Jogar** |

> A cobra não pode dar meia-volta em cima de si mesma — o último comando na
> direção oposta é ignorado durante o movimento.

## 🚀 Como rodar

O jogo é estático, então qualquer servidor HTTP local funciona:

```bash
# Python (já vem no macOS e na maioria dos Linux)
python3 -m http.server 8000

# ou Node.js
npx serve .

# ou PHP
php -S localhost:8000
```

Depois abra **http://localhost:8000** no navegador.

Você também pode abrir o `index.html` direto com dois cliques — o jogo
funciona via `file://` porque não faz nenhuma requisição externa obrigatória
(a única externa é a fonte do Google Fonts, que apenas muda a tipografia).

## 📁 Estrutura

```
.
├── index.html   # estrutura, HUD e tela de overlay
├── style.css    # tema, animações e responsividade
├── script.js    # loop, colisões, partículas e estado do jogo
└── README.md
```

## 🧠 Como funciona

- **Tabuleiro:** canvas de 480×480 px dividido em uma grade de **20×20** células
  de 24 px. Todo o desenho é feito no canvas; o DOM cuida só do placar e do
  overlay.
- **Loop:** um `requestAnimationFrame` roda continuamente e acumula tempo. A
  cada `speed` milissegundos (130 ms no nível 1, menos 4 ms por nível) a cobra
  avança uma célula. Isso mantém o movimento independente da taxa de quadros.
- **Colisões:** parede (saiu da grade) e corpo próprio. A cauda é ignorada na
  checagem porque ela será removida no mesmo passo, a menos que a cobra cresça.
- **Fila de direção:** as teclas alteram `queuedDir`, que só vira `dir` no
  próximo passo. Isso impede que duas teclas em sequência rápida virem a cobra
  180° dentro do mesmo movimento.
- **Pontuação:** cada fruta vale 10 pontos. O nível é `min(8, 1 + pontos / 50)`.
  A cada 50 pontos o recorde é reavaliado e salvo no `localStorage`.
- **Partículas:** um array simples de partículas com posição, velocidade,
  tamanho e `life` decrescente. São atualizadas e desenhadas em todo quadro
  com `globalCompositeOperation = 'lighter'` para o brilho aditivo.
- **Estados:** `idle` → `running` → (`paused`) → `over` / `won`. Cada estado
  decide se o overlay aparece e se o botão age como *Jogar*, *Continuar* ou
  *Reiniciar*.

## 🎨 Personalização

Os valores principais ficam em duas lugares easy de ajustar:

**No `style.css`**, no bloco `:root`:

```css
--snake: #38f9a5;   /* cor da cobra */
--food:  #ff4d6d;   /* cor da fruta */
--accent: #6ee7ff;  /* cor de destaque */
```

**No `script.js`**, no topo:

```js
const GRID = 20;              /* tamanho da grade */
const POINTS_PER_FOOD = 10;   /* pontos por fruta */
const BASE_SPEED = 130;       /* ms por passo no nível 1 */
const SPEED_STEP = 4;         /* ms removidos por nível */
const MAX_LEVEL = 8;
```

## 📄 Licença

MIT — use à vontade.
