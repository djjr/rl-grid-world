'use strict';

/**
 * Renderer — draws the GridWorld on a <canvas>.
 *
 * Each cell is drawn as a colored square with a small gap between cells.
 * The agent is drawn as a circle.
 *
 * When showQ is true and a QLearningAgent is provided, cells are tinted
 * by their max Q-value (green = high, red = low) and small arrows show
 * the best action direction.
 */

const COLORS = {
  empty: '#0f3460',
  wall:  '#1a1a2e',
  goal:  '#2ecc71',
  pit:   '#e74c3c',
  agent: '#f1c40f',
  grid:  '#16213e',  // gap color (matches canvas bg)
};

// Arrow symbols for each action direction
const ARROW_CHARS = ['↑', '→', '↓', '←'];

class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {GridWorld} env
   */
  constructor(canvas, env) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.env = env;
    this.gap = 2;
    this.qAgent = null;  // set this to a QLearningAgent to enable overlay
    this.showQ = false;  // toggle Q-value overlay
  }

  get cellSize() {
    const usableW = this.canvas.width - this.gap * (this.env.cols + 1);
    const usableH = this.canvas.height - this.gap * (this.env.rows + 1);
    return Math.floor(Math.min(usableW / this.env.cols, usableH / this.env.rows));
  }

  cellOrigin(row, col) {
    const size = this.cellSize;
    const x = this.gap + col * (size + this.gap);
    const y = this.gap + row * (size + this.gap);
    return [x, y];
  }

  /**
   * Convert a Q-value to a color.
   * Positive values → green, negative → red, zero → neutral blue.
   */
  qColor(value, minQ, maxQ) {
    // Normalize to [-1, 1] range
    const range = Math.max(Math.abs(minQ), Math.abs(maxQ), 0.01);
    const norm = Math.max(-1, Math.min(1, value / range));

    if (norm >= 0) {
      // Blend from base blue (#0f3460) toward green
      const t = norm;
      const r = Math.round(15 * (1 - t) + 46 * t);
      const g = Math.round(52 * (1 - t) + 204 * t);
      const b = Math.round(96 * (1 - t) + 113 * t);
      return `rgb(${r},${g},${b})`;
    } else {
      // Blend from base blue toward red
      const t = -norm;
      const r = Math.round(15 * (1 - t) + 231 * t);
      const g = Math.round(52 * (1 - t) + 76 * t);
      const b = Math.round(96 * (1 - t) + 60 * t);
      return `rgb(${r},${g},${b})`;
    }
  }

  draw() {
    const ctx = this.ctx;
    const size = this.cellSize;

    // If showing Q-values, compute global min/max for consistent coloring
    let minQ = 0, maxQ = 0;
    if (this.showQ && this.qAgent) {
      for (let r = 0; r < this.env.rows; r++) {
        for (let c = 0; c < this.env.cols; c++) {
          if (this.env.layout[r][c] === CELL_WALL) continue;
          const v = this.qAgent.getMaxQ(r, c);
          if (v < minQ) minQ = v;
          if (v > maxQ) maxQ = v;
        }
      }
    }

    // Clear
    ctx.fillStyle = COLORS.grid;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw cells
    for (let r = 0; r < this.env.rows; r++) {
      for (let c = 0; c < this.env.cols; c++) {
        const [x, y] = this.cellOrigin(r, c);
        const cell = this.env.layout[r][c];

        // Base cell color
        if (cell === CELL_WALL)      ctx.fillStyle = COLORS.wall;
        else if (cell === CELL_GOAL) ctx.fillStyle = COLORS.goal;
        else if (cell === CELL_PIT)  ctx.fillStyle = COLORS.pit;
        else if (this.showQ && this.qAgent) {
          ctx.fillStyle = this.qColor(this.qAgent.getMaxQ(r, c), minQ, maxQ);
        }
        else ctx.fillStyle = COLORS.empty;

        ctx.fillRect(x, y, size, size);

        // Label goal and pit cells
        if (cell === CELL_GOAL || cell === CELL_PIT) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(size * 0.35)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            cell === CELL_GOAL ? 'G' : 'P',
            x + size / 2,
            y + size / 2
          );
        }

        // Q-value overlay: show best action arrow and max Q value
        if (this.showQ && this.qAgent && cell === CELL_EMPTY) {
          const qValues = this.qAgent.getQ(r, c);
          let bestA = 0;
          for (let a = 1; a < NUM_ACTIONS; a++) {
            if (qValues[a] > qValues[bestA]) bestA = a;
          }
          const maxVal = qValues[bestA];

          // Arrow showing best direction
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = `bold ${Math.floor(size * 0.4)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ARROW_CHARS[bestA], x + size / 2, y + size * 0.4);

          // Numeric value
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.font = `${Math.floor(size * 0.18)}px system-ui`;
          ctx.fillText(maxVal.toFixed(2), x + size / 2, y + size * 0.75);
        }
      }
    }

    // Draw agent
    const [ax, ay] = this.cellOrigin(this.env.agentRow, this.env.agentCol);
    ctx.fillStyle = COLORS.agent;
    ctx.beginPath();
    ctx.arc(ax + size / 2, ay + size / 2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.font = `bold ${Math.floor(size * 0.3)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', ax + size / 2, ay + size / 2);
  }
}
