// Tiny pixel-art raster: every shape is filled per-pixel (no anti-aliasing),
// so sprites stay crisp when scaled up with image smoothing disabled.
(function (global) {
  'use strict';

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  // Darken a color, nudging it toward a warm purple so outlines feel hand-picked
  // instead of flat black (matches the soft-outline chibi style).
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const k = 1 - amt;
    return rgbToHex(r * k + 20 * amt, g * k + 8 * amt, b * k + 28 * amt);
  }

  function tint(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  }

  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }

  class Buf {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.d = new Array(w * h).fill(null);
      this.clip = false; // when true, only already-filled pixels can be painted
    }

    set(x, y, c) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x;
      if (this.clip && this.d[i] === null) return;
      this.d[i] = c;
    }

    get(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.d[y * this.w + x];
    }

    rect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
      return this;
    }

    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.set(x, y, c);
        }
      }
      return this;
    }

    poly(pts, c) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of pts) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
          const px = x + 0.5, py = y + 0.5;
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
          }
          if (inside) this.set(x, y, c);
        }
      }
      return this;
    }

    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }

    // Stamp a hand-authored map. '.' or ' ' are transparent.
    map(x, y, rows, pal, flip) {
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === '.' || ch === ' ') continue;
          const c = pal[ch];
          if (c) this.set(flip ? x + row.length - 1 - i : x + i, y + j, c);
        }
      });
      return this;
    }

    // Mirror the left half onto the right half (for symmetric bodies).
    mirrorX() {
      const half = Math.floor(this.w / 2);
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < half; x++) {
          const v = this.d[y * this.w + x];
          if (v !== null) this.d[y * this.w + (this.w - 1 - x)] = v;
        }
      }
      return this;
    }

    // Wrap the filled shape in a 1px outline made from a darker version of
    // the neighbouring color.
    outline(amt = 0.55, color = null) {
      const out = this.clone();
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y) !== null) continue;
          const n = this.get(x, y - 1) || this.get(x, y + 1) || this.get(x - 1, y) || this.get(x + 1, y);
          if (n) out.d[y * this.w + x] = color || shade(n, amt);
        }
      }
      this.d = out.d;
      return this;
    }

    // Darken pixels that border empty space on the given side (cheap rim shading).
    rimShade(dx, dy, amt) {
      const src = this.d.slice();
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const v = src[y * this.w + x];
          if (v === null) continue;
          const nx = x + dx, ny = y + dy;
          const n = nx < 0 || ny < 0 || nx >= this.w || ny >= this.h ? null : src[ny * this.w + nx];
          if (n === null) this.d[y * this.w + x] = shade(v, amt);
        }
      }
      return this;
    }

    draw(other, ox = 0, oy = 0) {
      for (let y = 0; y < other.h; y++) {
        for (let x = 0; x < other.w; x++) {
          const v = other.d[y * other.w + x];
          if (v !== null) this.set(x + ox, y + oy, v);
        }
      }
      return this;
    }

    clone() {
      const b = new Buf(this.w, this.h);
      b.d = this.d.slice();
      return b;
    }

    toCanvas(scale = 1) {
      const cv = document.createElement('canvas');
      cv.width = this.w * scale;
      cv.height = this.h * scale;
      const ctx = cv.getContext('2d');
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const v = this.d[y * this.w + x];
          if (v === null) continue;
          ctx.fillStyle = v;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      return cv;
    }
  }

  global.PX = { Buf, shade, tint, mix, hexToRgb, rgbToHex };
})(window);
