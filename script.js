(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const levelEl = document.getElementById('level');

  const overlay = document.getElementById('overlay');
  const panelTitle = document.getElementById('panel-title');
  const panelText = document.getElementById('panel-text');
  const btnStart = document.getElementById('btn-start');
  const shell = document.querySelector('.board-shell');

  const GRID = 20;
  const CELL = canvas.width / GRID;
  const POINTS_PER_FOOD = 10;
  const BASE_SPEED = 130;
  const SPEED_STEP = 4;
  const MAX_LEVEL = 8;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  let snake, dir, queuedDir, food, score, highscore, level;
  let state, loopId, lastTime, stepTime, particles, flash, isNewRecord;

  highscore = Number(localStorage.getItem('snake-highscore') || 0);
  highscoreEl.textContent = highscore;

  /* ---------------- helpers ---------------- */

  const randInt = (max) => Math.floor(Math.random() * max);
  const cellCenter = (cell) => ({
    x: cell.x * CELL + CELL / 2,
    y: cell.y * CELL + CELL / 2
  });
  const sameCell = (a, b) => a.x === b.x && a.y === b.y;

  function occupied(cells) {
    return new Set(cells.map((c) => `${c.x},${c.y}`));
  }

  function spawnFood() {
    const taken = occupied(snake);
    const free = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    // win state: board full -> no free cell
    if (free.length === 0) return null;
    return free[randInt(free.length)];
  }

  /* ---------------- particles ---------------- */

  function burst(x, y, color, amount = 18) {
    for (let i = 0; i < amount; i++) {
      const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.4;
      const speed = 1.2 + Math.random() * 3.4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.022 + Math.random() * 0.03,
        size: 2 + Math.random() * 3.5,
        color
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.vy += 0.06;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (flash > 0) flash -= 0.06;
  }

  /* ---------------- state ---------------- */

  function reset() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];
    dir = DIRS.right;
    queuedDir = DIRS.right;
    score = 0;
    level = 1;
    stepTime = 0;
    lastTime = 0;
    particles = [];
    flash = 0;
    isNewRecord = false;
    food = spawnFood();
    syncHud();
  }

  function syncHud(popScore = false) {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    highscoreEl.textContent = highscore;
    if (popScore) {
      scoreEl.classList.remove('pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('pop');
    }
  }

  /* ---------------- flow ---------------- */

  function start() {
    reset();
    state = 'running';
    hideOverlay();
    cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(loop);
  }

  function pause() {
    if (state !== 'running') return;
    state = 'paused';
    showPanel({
      title: 'PAUSADO',
      titleClass: '',
      body: 'Respire fundo. O jogo está parado.',
      button: 'Continuar',
      score: false
    });
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'running';
    hideOverlay();
    cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === 'running') pause();
    else if (state === 'paused') resume();
  }

  function gameOver() {
    state = 'over';
    shell.classList.add('hit');
    setTimeout(() => shell.classList.remove('hit'), 450);

    const head = snake[0];
    if (head) burst(cellCenter(head).x, cellCenter(head).y, '#ff4d6d', 34);

    if (score > highscore) {
      highscore = score;
      localStorage.setItem('snake-highscore', String(highscore));
      isNewRecord = true;
    }
    syncHud();

    const headHtml = isNewRecord
      ? '<span class="new-record">NOVO RECORDE!</span>'
      : '';

    showPanel({
      title: 'GAME OVER',
      titleClass: 'danger',
      body: headHtml,
      button: 'Reiniciar',
      score: true
    });
    btnStart.focus();
  }

  function showPanel({ title, titleClass, body, button, score: showScore }) {
    panelTitle.textContent = title;
    panelTitle.className = 'title' + (titleClass ? ' ' + titleClass : '');
    panelText.innerHTML = showScore
      ? `${body}<span class="final-score">${score}</span>Pontuação final`
      : body;
    btnStart.textContent = button;
    overlay.classList.remove('hidden');
    // restart entrance animation
    const panel = document.getElementById('panel');
    panel.style.animation = 'none';
    void panel.offsetWidth;
    panel.style.animation = '';
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  /* ---------------- loop ---------------- */

  function step() {
    dir = queuedDir;
    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y
    };

    // wall collision
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
      return gameOver();
    }

    // tail cell is freed unless we grow, so ignore it
    const willGrow = food && sameCell(head, food);
    const body = willGrow ? snake : snake.slice(0, -1);
    if (body.some((c) => sameCell(c, head))) {
      return gameOver();
    }

    snake.unshift(head);

    if (willGrow) {
      score += POINTS_PER_FOOD;
      level = Math.min(MAX_LEVEL, 1 + Math.floor(score / 50));
      const { x, y } = cellCenter(head);
      burst(x, y, '#ff4d6d', 20);
      burst(x, y, '#ffd166', 10);
      flash = 1;

      food = spawnFood();
      syncHud(true);
      shell.classList.remove('shake');
      void shell.offsetWidth;
      shell.classList.add('shake');

      if (!food) {
        state = 'won';
        showPanel({
          title: 'VOCÊ VENCEU!',
          titleClass: '',
          body: `Tabuleiro completo com <strong>${score}</strong> pontos.`,
          button: 'Jogar de novo',
          score: false
        });
        return;
      }
    } else {
      snake.pop();
    }
  }

  function loop(now) {
    if (state !== 'running' && state !== 'won') return;
    if (!lastTime) lastTime = now;
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;

    const speed = BASE_SPEED - (level - 1) * SPEED_STEP;
    stepTime += dt;

    while (stepTime >= speed) {
      stepTime -= speed;
      step();
      if (state !== 'running' && state !== 'won') return;
    }

    updateParticles();
    draw();
    loopId = requestAnimationFrame(loop);
  }

  /* ---------------- render ---------------- */

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(
        food ? cellCenter(food).x : canvas.width / 2,
        food ? cellCenter(food).y : canvas.height / 2,
        0,
        food ? cellCenter(food).x : canvas.width / 2,
        food ? cellCenter(food).y : canvas.height / 2,
        CELL * 6
      );
      g.addColorStop(0, `rgba(255,209,102,${0.22 * flash})`);
      g.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (food) drawFood();
    drawSnake();
    drawParticles();
  }

  function drawGrid() {
    ctx.fillStyle = '#0a0f1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--grid').trim() || 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < GRID; i++) {
      const p = i * CELL + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height);
      ctx.moveTo(0, p); ctx.lineTo(canvas.width, p);
    }
    ctx.stroke();
  }

  function drawFood() {
    const { x, y } = cellCenter(food);
    const pulse = 1 + Math.sin(Date.now() / 180) * 0.08;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 77, 109, .9)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.33 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.arc(x - CELL * 0.1, y - CELL * 0.12, CELL * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function drawSnake() {
    const pad = CELL * 0.09;
    const size = CELL - pad * 2;

    snake.forEach((cell, i) => {
      const { x, y } = cellCenter(cell);
      const t = i / Math.max(snake.length - 1, 1);
      const r = i === 0 ? CELL * 0.3 : CELL * 0.24;

      const g = ctx.createLinearGradient(x - size / 2, y - size / 2, x + size / 2, y + size / 2);
      g.addColorStop(0, i === 0 ? '#8affd4' : '#38f9a5');
      g.addColorStop(1, i === 0 ? '#17d183' : '#0e9c68');

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = 'rgba(56, 249, 165, .8)';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = g;
      roundRect(x - size / 2, y - size / 2, size, size, r);
      ctx.fill();
      ctx.restore();

      // subtle inner scale highlight
      if (i < 12) {
        ctx.fillStyle = `rgba(255,255,255,${0.14 - t * 0.1})`;
        roundRect(
          x - size / 2 + size * 0.16,
          y - size / 2 + size * 0.14,
          size * 0.68,
          size * 0.22,
          size * 0.1
        );
        ctx.fill();
      }
    });

    drawEyes(snake[0], dir);
  }

  function drawEyes(head, d) {
    const { x, y } = cellCenter(head);
    const off = CELL * 0.16;
    const perpX = -d.y;
    const perpY = d.x;
    const front = CELL * 0.12;

    ctx.fillStyle = '#06210f';
    for (const sign of [-1, 1]) {
      const ex = x + d.x * front + perpX * off * sign;
      const ey = y + d.y * front + perpY * off * sign;
      ctx.beginPath();
      ctx.arc(ex, ey, CELL * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- input ---------------- */

  function turn(next) {
    if (state !== 'running') return;
    // no 180 degree reversal
    if (next.x === -dir.x && next.y === -dir.y) return;
    queuedDir = next;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      start();
      return;
    }
    if (e.key === 'Enter' && state !== 'running') {
      e.preventDefault();
      btnStart.click();
      return;
    }
    const name = KEYS[e.key];
    if (!name) return;
    e.preventDefault();
    turn(DIRS[name]);
  });

  btnStart.addEventListener('click', () => {
    if (state === 'paused') resume();
    else start();
  });

  document.querySelectorAll('.dpad__btn').forEach((btn) => {
    btn.addEventListener('click', () => turn(DIRS[btn.dataset.dir]));
  });

  // swipe
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      turn(dx > 0 ? DIRS.right : DIRS.left);
    } else {
      turn(dy > 0 ? DIRS.down : DIRS.up);
    }
  }, { passive: true });

  // keep focus on the board so space/arrows don't scroll
  canvas.addEventListener('pointerdown', () => {
    if (state === 'running' || state === 'paused') canvas.focus();
  });

  /* ---------------- init ---------------- */

  state = 'idle';
  reset();
  showPanel({
    title: 'SNAKE',
    titleClass: '',
    body: 'Use as setas ou <strong>WASD</strong> para mover.<br>Não bata na parede nem em você mesmo.',
    button: 'Jogar',
    score: false
  });
})();
