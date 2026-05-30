/**
 * Photo Booth – Frame Template Engine
 * -----------------------------------
 * Setiap template digambar 100% di atas <canvas> (tanpa aset gambar eksternal)
 * sehingga selalu tajam saat dicetak / di-download dan tetap jalan offline.
 *
 * Cara kerja:
 *  - `photos`     : jumlah foto yang harus diambil user.
 *  - `size`       : ukuran kanvas output (px). Rasio = referensi bingkai.
 *  - `accent`     : warna aksen untuk thumbnail / UI.
 *  - `render(ctx, images, opt)` : menggambar bingkai + menempel foto ke slot.
 *
 * `images` adalah array HTMLImageElement (boleh berisi null untuk preview).
 * `opt.filter` = CSS filter string yang diterapkan ke setiap foto.
 * `opt.caption` & `opt.date` = teks yang bisa diisi admin/user.
 */

const DEG = Math.PI / 180;

/* ----------------------------- low level utils ---------------------------- */

function roundRect(ctx, x, y, w, h, r = 0) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Gambar foto memenuhi slot (cover) dengan opsi zoom & geser per foto.
// transform = { scale>=1, ox(-1..1), oy(-1..1) }
export function drawImageCover(ctx, img, dx, dy, dw, dh, transform) {
  if (!img) {
    ctx.fillStyle = "#c8cdd8";
    ctx.fillRect(dx, dy, dw, dh);
    // placeholder ikon kamera
    ctx.fillStyle = "rgba(255,255,255,.65)";
    const s = Math.min(dw, dh) * 0.18;
    roundRect(ctx, dx + dw / 2 - s, dy + dh / 2 - s * 0.7, s * 2, s * 1.5, s * 0.18);
    ctx.fill();
    ctx.fillStyle = "#c8cdd8";
    ctx.beginPath();
    ctx.arc(dx + dw / 2, dy + dh / 2 + s * 0.05, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const scale = Math.max(1, transform?.scale || 1);
  const ox = Math.max(-1, Math.min(1, transform?.ox || 0));
  const oy = Math.max(-1, Math.min(1, transform?.oy || 0));
  const ir = img.width / img.height;
  const r = dw / dh;
  let sw, sh;
  if (ir > r) {
    sh = img.height;
    sw = sh * r;
  } else {
    sw = img.width;
    sh = sw / r;
  }
  sw /= scale;
  sh /= scale;
  const marginX = img.width - sw;
  const marginY = img.height - sh;
  let sx = (marginX / 2) * (1 + ox);
  let sy = (marginY / 2) * (1 + oy);
  sx = Math.max(0, Math.min(marginX, sx));
  sy = Math.max(0, Math.min(marginY, sy));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Tempel 1 foto ke slot dengan opsi border (frame putih), rotasi, sudut membulat,
 * bayangan, dan filter.
 */
function heartPath(ctx, x, y, width, height) {
  const top = height * 0.3;
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + top);
  ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + top);
  ctx.bezierCurveTo(x, y + (height + top) / 2, x + width / 2, y + (height + top) / 2, x + width / 2, y + height);
  ctx.bezierCurveTo(x + width / 2, y + (height + top) / 2, x + width, y + (height + top) / 2, x + width, y + top);
  ctx.bezierCurveTo(x + width, y, x + width / 2, y, x + width / 2, y + top);
  ctx.closePath();
}

function shapePath(ctx, shape, x, y, w, h, r) {
  if (shape === "heart") heartPath(ctx, x, y, w, h);
  else roundRect(ctx, x, y, w, h, r);
}

function placePhoto(ctx, imgOrWrap, opt) {
  // imgOrWrap bisa HTMLImageElement atau wrapper { img, t }
  let img = imgOrWrap;
  let transform = null;
  if (imgOrWrap && typeof imgOrWrap === "object" && "img" in imgOrWrap && !(imgOrWrap instanceof HTMLImageElement)) {
    img = imgOrWrap.img;
    transform = imgOrWrap.t;
  }
  const {
    x,
    y,
    w,
    h,
    r = 0,
    rot = 0,
    border = 0,
    borderColor = "#ffffff",
    captionH = 0,
    shadow = true,
    filter = "none",
    shape = "rect",
  } = opt;
  const isHeart = shape === "heart";

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate(rot * DEG);

  // frame / border (kertas polaroid) -- hanya untuk bentuk persegi
  if (!isHeart && (border > 0 || captionH > 0)) {
    if (shadow) {
      ctx.shadowColor = "rgba(15,23,42,.30)";
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 14;
    }
    ctx.fillStyle = borderColor;
    roundRect(
      ctx,
      -w / 2 - border,
      -h / 2 - border,
      w + border * 2,
      h + border * 2 + captionH,
      Math.max(0, r * 0.4)
    );
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else if (shadow) {
    ctx.shadowColor = "rgba(15,23,42,.30)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#000";
    shapePath(ctx, shape, -w / 2, -h / 2, w, h, r);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // foto (clip + filter)
  ctx.save();
  shapePath(ctx, shape, -w / 2, -h / 2, w, h, r);
  ctx.clip();
  ctx.filter = filter || "none";
  drawImageCover(ctx, img, -w / 2, -h / 2, w, h, transform);
  ctx.filter = "none";
  ctx.restore();

  ctx.restore();
}

// override warna latar dari UI (string solid ATAU array stop gradient). null = default template
let currentBgOverride = null;

function applyBgOverride(ctx, w, h) {
  const bg = currentBgOverride;
  ctx.fillStyle = Array.isArray(bg) ? linearGradient(ctx, w, h, bg, 135) : bg;
  ctx.fillRect(0, 0, w, h);
}

function fillBg(ctx, w, h, color) {
  if (currentBgOverride) {
    applyBgOverride(ctx, w, h);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

// untuk latar bergradien -> tetap bisa di-override warna solid/gradien dari UI
function fillBgStops(ctx, w, h, stops, angle = 135) {
  if (currentBgOverride) {
    applyBgOverride(ctx, w, h);
    return;
  }
  ctx.fillStyle = linearGradient(ctx, w, h, stops, angle);
  ctx.fillRect(0, 0, w, h);
}

function linearGradient(ctx, w, h, stops, angle = 135) {
  const a = angle * DEG;
  const x = Math.cos(a);
  const y = Math.sin(a);
  const g = ctx.createLinearGradient(
    w / 2 - (x * w) / 2,
    h / 2 - (y * h) / 2,
    w / 2 + (x * w) / 2,
    h / 2 + (y * h) / 2
  );
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// lebar maksimum teks otomatis (di-set composeTemplate per template)
let currentMaxTextWidth = null;

function centerText(ctx, text, x, y, font, color, opt = {}) {
  ctx.save();
  let useFont = font;
  let letterSpacing = opt.letterSpacing || 0;

  // auto-shrink agar judul custom (mis. yang panjang) selalu muat di lebar slot
  const maxW = opt.maxWidth != null ? opt.maxWidth : currentMaxTextWidth;
  if (maxW) {
    ctx.font = useFont;
    const measure = ctx.measureText(String(text)).width + letterSpacing * Math.max(0, String(text).length - 1);
    if (measure > maxW) {
      const ratio = maxW / measure;
      const m = useFont.match(/(\d+(?:\.\d+)?)px/);
      if (m) {
        const ns = Math.max(8, Math.floor(parseFloat(m[1]) * ratio));
        useFont = useFont.replace(/(\d+(?:\.\d+)?)px/, `${ns}px`);
      }
      letterSpacing *= ratio;
    }
  }

  ctx.font = useFont;
  ctx.fillStyle = color;
  ctx.textAlign = opt.align || "center";
  ctx.textBaseline = opt.baseline || "alphabetic";
  if (opt.shadow) {
    ctx.shadowColor = opt.shadow;
    ctx.shadowBlur = opt.shadowBlur || 8;
  }
  if (letterSpacing) {
    const chars = String(text).split("");
    const total = chars.reduce(
      (acc, c) => acc + ctx.measureText(c).width + letterSpacing,
      -letterSpacing
    );
    let cursor = x - total / 2;
    ctx.textAlign = "left";
    chars.forEach((c) => {
      ctx.fillText(c, cursor, y);
      cursor += ctx.measureText(c).width + letterSpacing;
    });
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function sprocketStrip(ctx, x, y, w, h, holeW, holeH, gap, color = "#fafafa") {
  // film perforation column
  ctx.fillStyle = color;
  let cy = y + gap;
  while (cy + holeH < y + h) {
    roundRect(ctx, x + (w - holeW) / 2, cy, holeW, holeH, holeH * 0.25);
    ctx.fill();
    cy += holeH + gap;
  }
}

function noiseDots(ctx, w, h, count, colors, sizeRange = [4, 12], alpha = 0.9, seed = 7) {
  // deterministic pseudo-random confetti / paper specks
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const size = sizeRange[0] + rnd() * (sizeRange[1] - sizeRange[0]);
    ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5);
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function heart(ctx, x, y, s, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x - s / 2, y + s * 0.55, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.55, x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function star(ctx, cx, cy, spikes, outer, inner, color) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i += 1) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function gridPaper(ctx, w, h, cell, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function flower(ctx, cx, cy, r, petal, center) {
  ctx.save();
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.58, r * 0.32, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strawberry(ctx, cx, cy, s) {
  ctx.save();
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(cx, cy + s);
  ctx.bezierCurveTo(cx - s, cy + s * 0.4, cx - s * 0.7, cy - s * 0.2, cx, cy - s * 0.2);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 0.2, cx + s, cy + s * 0.4, cx, cy + s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#16a34a";
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.2, s * 0.5, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fde68a";
  const seeds = [[-0.3, 0.25], [0.2, 0.3], [-0.1, 0.55], [0.35, 0.55], [0, 0.15], [-0.4, 0.5]];
  seeds.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(cx + dx * s, cy + dy * s, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// teks dengan tiap huruf warna berbeda
function multiText(ctx, text, cx, y, font, colors, spacing = 4) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const chars = String(text).split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b + spacing, -spacing);
  let cur = cx - total / 2;
  chars.forEach((c, i) => {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillText(c, cur, y);
    cur += widths[i] + spacing;
  });
  ctx.restore();
}

// strip vertikal generik (mengurangi pengulangan) -> menggambar N foto
function vstrip(ctx, images, opt, cfg) {
  const { w, top, footer, pad, count } = cfg;
  const gap = cfg.gap ?? 26;
  const innerW = w - pad * 2;
  const cellH = (cfg.h - top - footer - gap * (count - 1)) / count;
  images.slice(0, count).forEach((img, i) => {
    placePhoto(ctx, img, {
      x: pad,
      y: top + i * (cellH + gap),
      w: innerW,
      h: cellH,
      r: cfg.r ?? 12,
      border: cfg.border ?? 0,
      borderColor: cfg.borderColor ?? "#ffffff",
      rot: cfg.rot ? cfg.rot(i) : 0,
      shadow: cfg.shadow ?? false,
      filter: opt.filter,
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                                 TEMPLATES                                  */
/* -------------------------------------------------------------------------- */

export const TEMPLATES = [
  /* ===================== TEMA UTAMA: HARI JADI BOGOR 544 ================== */
  {
    id: "bogor-544",
    name: "Hari Jadi Bogor 544",
    desc: "Tema utama HJB — merah putih, mewah & elegan",
    emoji: "🎉",
    photos: 4,
    accent: "#b01e2e",
    size: { w: 880, h: 2620 },
    defaultCaption: "Dirgahayu Kabupaten Bogor",
    defaultDate: "3 Juni 2026",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      const GOLD = "#e9c46a";
      const GOLD_SOFT = "rgba(233,196,106,.7)";
      const RED = "#8c1422";

      // latar merah elegan (bisa di-override warna dari UI)
      fillBgStops(ctx, w, h, [
        [0, "#8c1422"],
        [0.5, "#b01e2e"],
        [1, "#76101c"],
      ]);
      // kilau confetti emas & putih (meriah)
      noiseDots(ctx, w, h, 110, ["#f6d365", "#ffe9a8", "#ffffff"], [2, 9], 0.5, 29);

      // bingkai emas ganda (mewah)
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 6;
      roundRect(ctx, 26, 26, w - 52, h - 52, 30);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = GOLD_SOFT;
      roundRect(ctx, 42, 42, w - 84, h - 84, 24);
      ctx.stroke();
      ctx.restore();
      // ornamen titik emas di sudut
      [[64, 64], [w - 64, 64], [64, h - 64], [w - 64, h - 64]].forEach(([x, y]) => {
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      });

      // header
      centerText(ctx, "HARI JADI", w / 2, 132, "800 46px Georgia, serif", GOLD, { letterSpacing: 16 });
      centerText(ctx, "BOGOR", w / 2, 248, "900 128px Georgia, serif", "#ffffff", { letterSpacing: 6, shadow: "rgba(0,0,0,.35)", shadowBlur: 10 });
      // badge KE-544 emas dengan garis putih
      ctx.save();
      ctx.fillStyle = GOLD;
      roundRect(ctx, w / 2 - 155, 288, 310, 100, 50);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      roundRect(ctx, w / 2 - 155, 288, 310, 100, 50);
      ctx.stroke();
      centerText(ctx, "KE-544", w / 2, 356, "900 64px Georgia, serif", RED, { letterSpacing: 6 });
      ctx.restore();
      // sparkle dekat header
      star(ctx, 96, 230, 4, 24, 9, GOLD);
      star(ctx, w - 96, 230, 4, 24, 9, GOLD);

      // foto: border putih + bingkai emas tipis (merah-putih-emas)
      const top = 450;
      const footer = 180;
      const pad = 84;
      const gap = 30;
      const count = 4;
      const innerW = w - pad * 2;
      const cellH = (h - top - footer - gap * (count - 1)) / count;
      images.slice(0, 4).forEach((img, i) => {
        const y = top + i * (cellH + gap);
        placePhoto(ctx, img, {
          x: pad,
          y,
          w: innerW,
          h: cellH,
          r: 8,
          border: 14,
          borderColor: "#ffffff",
          shadow: true,
          filter: opt.filter,
        });
        ctx.save();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 3;
        roundRect(ctx, pad - 20, y - 20, innerW + 40, cellH + 40, 14);
        ctx.stroke();
        ctx.restore();
      });

      // footer elegan
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, h - 104, "700 40px Georgia, serif", "#ffffff");
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 160, h - 78);
      ctx.lineTo(w / 2 + 160, h - 78);
      ctx.stroke();
      centerText(ctx, opt.date || this.defaultDate, w / 2, h - 46, "600 32px Georgia, serif", GOLD, { letterSpacing: 5 });
    },
  },

  /* 1. STRIP KLASIK -------------------------------------------------------- */
  {
    id: "strip-klasik",
    name: "Strip Klasik",
    desc: "4 foto vertikal, gaya photobooth klasik",
    emoji: "🎞️",
    photos: 4,
    accent: "#0f172a",
    size: { w: 760, h: 2280 },
    defaultCaption: "DPMD KAB. BOGOR",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      const pad = 46;
      const innerW = w - pad * 2;
      const footer = 210;
      const gap = 26;
      const cellH = (h - pad * 2 - footer - gap * 3) / 4;

      fillBg(ctx, w, h, "#111111");
      // tepi putih tipis
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, w - 28, h - 28);

      images.slice(0, 4).forEach((img, i) => {
        const y = pad + i * (cellH + gap);
        placePhoto(ctx, img, {
          x: pad,
          y,
          w: innerW,
          h: cellH,
          r: 8,
          shadow: false,
          filter: opt.filter,
        });
      });

      // footer
      const fy = h - footer;
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, fy + 70, "900 46px Georgia, serif", "#ffffff", {
        letterSpacing: 4,
      });
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad + 60, fy + 100);
      ctx.lineTo(w - pad - 60, fy + 100);
      ctx.stroke();
      centerText(ctx, opt.date || "", w / 2, fy + 150, "500 34px Georgia, serif", "rgba(255,255,255,.75)", {
        letterSpacing: 6,
      });
    },
  },

  /* 2. PITA FILM ----------------------------------------------------------- */
  {
    id: "pita-film",
    name: "Pita Film",
    desc: "4 foto dalam gulungan film + sprocket",
    emoji: "📽️",
    photos: 4,
    accent: "#1c1917",
    size: { w: 820, h: 2520 },
    defaultCaption: "Best Moments",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#f4efe2"); // kertas krem
      noiseDots(ctx, w, h, 60, ["#e7dcc4"], [2, 6], 0.5, 11);

      const filmX = 120;
      const filmW = w - filmX - 36;
      const filmY = 40;
      const filmH = h - 80;

      // badan film hitam
      fillBg2(ctx, filmX, filmY, filmW, filmH, "#161616");
      // sprocket kiri & kanan
      const railW = 46;
      sprocketStrip(ctx, filmX + 8, filmY + 24, railW, filmH - 48, 30, 40, 30);
      sprocketStrip(ctx, filmX + filmW - railW - 8, filmY + 24, railW, filmH - 48, 30, 40, 30);

      const innerX = filmX + railW + 30;
      const innerW = filmW - (railW + 30) * 2;
      const pad = 30;
      const gap = 26;
      const cellH = (filmH - pad * 2 - gap * 3) / 4;
      images.slice(0, 4).forEach((img, i) => {
        const y = filmY + pad + i * (cellH + gap);
        placePhoto(ctx, img, {
          x: innerX,
          y,
          w: innerW,
          h: cellH,
          r: 4,
          shadow: false,
          filter: opt.filter,
        });
      });

      // judul vertikal di pita kiri krem
      ctx.save();
      ctx.translate(56, h / 2);
      ctx.rotate(-90 * DEG);
      centerText(ctx, opt.caption || this.defaultCaption, 0, 0, "italic 700 56px Georgia, serif", "#1c1917");
      centerText(ctx, "with my favorite people", 0, 40, "italic 400 26px Georgia, serif", "#5b5446");
      ctx.restore();
    },
  },

  /* 3. POLAROID ------------------------------------------------------------ */
  {
    id: "polaroid",
    name: "Polaroid",
    desc: "1 foto besar dengan bingkai polaroid",
    emoji: "📸",
    photos: 1,
    accent: "#f43f5e",
    size: { w: 1040, h: 1240 },
    defaultCaption: "Photo Booth DPMD",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#fde2e4"],
        [0.5, "#fff1f2"],
        [1, "#e7d8c9"],
      ]);
      noiseDots(ctx, w, h, 40, ["#f9c5d1", "#e8d8c4"], [3, 9], 0.5, 5);

      const border = 56;
      const captionH = 190;
      const m = 110;
      const photoW = w - m * 2;
      const photoH = photoW;
      const photoY = 110;
      placePhoto(ctx, images[0], {
        x: m,
        y: photoY,
        w: photoW,
        h: photoH,
        r: 4,
        border,
        captionH,
        rot: -1.5,
        shadow: true,
        filter: opt.filter,
      });
      // caption di area putih bawah polaroid (rotasi ikut kartu)
      ctx.save();
      ctx.translate(w / 2, photoY + photoH / 2);
      ctx.rotate(-1.5 * DEG);
      centerText(ctx, opt.caption || this.defaultCaption, 0, photoH / 2 + 110, "italic 600 56px 'Brush Script MT', cursive", "#1f2937");
      centerText(ctx, opt.date || "", 0, photoH / 2 + 160, "500 30px Georgia, serif", "#6b7280", { letterSpacing: 4 });
      ctx.restore();
    },
  },

  /* 4. KOLASE FEARLESS ----------------------------------------------------- */
  {
    id: "kolase-fearless",
    name: "Kolase Elegan",
    desc: "4 foto miring di latar mewah",
    emoji: "✨",
    photos: 4,
    accent: "#b08968",
    size: { w: 900, h: 2500 },
    defaultCaption: "Fearless",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(
        ctx,
        w,
        h,
        [
          [0, "#e8ddd0"],
          [0.5, "#d8c4b0"],
          [1, "#c9b39c"],
        ],
        120
      );

      // sapuan emas
      ctx.save();
      ctx.strokeStyle = "rgba(180,138,90,.55)";
      ctx.lineWidth = 8;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-50, 380 + i * 18);
        ctx.bezierCurveTo(w * 0.4, 300 + i * 18, w * 0.7, 520 + i * 18, w + 50, 360 + i * 18);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-50, 1500 + i * 18);
        ctx.bezierCurveTo(w * 0.4, 1420 + i * 18, w * 0.7, 1640 + i * 18, w + 50, 1480 + i * 18);
        ctx.stroke();
      }
      ctx.restore();

      const pad = 130;
      const photoW = w - pad * 2;
      const photoH = 420;
      const gap = 70;
      const startY = 90;
      const rots = [-2.5, 2, -1.8, 2.4];
      images.slice(0, 4).forEach((img, i) => {
        const y = startY + i * (photoH + gap);
        placePhoto(ctx, img, {
          x: pad,
          y,
          w: photoW,
          h: photoH,
          r: 6,
          border: 22,
          rot: rots[i],
          shadow: true,
          filter: opt.filter,
        });
      });

      centerText(ctx, opt.caption || this.defaultCaption, w / 2, h - 70, "italic 700 78px 'Brush Script MT', cursive", "#2b2117");
      ctx.strokeStyle = "#2b2117";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 140, h - 48);
      ctx.lineTo(w / 2 + 140, h - 48);
      ctx.stroke();
    },
  },

  /* 5. PESTA --------------------------------------------------------------- */
  {
    id: "pesta",
    name: "Pesta",
    desc: "4 foto + banner & confetti",
    emoji: "🎉",
    photos: 4,
    accent: "#eab308",
    size: { w: 880, h: 2640 },
    defaultCaption: "You & Me, Forever a Team!",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#f5e9d3");
      noiseDots(
        ctx,
        w,
        h,
        90,
        ["#e9c46a", "#d4af37", "#f2cc8f", "#bda05a"],
        [5, 16],
        0.55,
        13
      );

      // header banner
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 130, "800 54px Georgia, serif", "#5b3a1e", { });
      // pita tanggal
      const bw = 420;
      const bh = 70;
      const bx = (w - bw) / 2;
      const by = 175;
      ctx.fillStyle = "#e9c46a";
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw - 28, by + bh / 2);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + 28, by + bh / 2);
      ctx.closePath();
      ctx.fill();
      centerText(ctx, opt.date || "DPMD KAB. BOGOR", w / 2, by + bh / 2 + 10, "700 30px Georgia, serif", "#5b3a1e", { letterSpacing: 3 });

      const pad = 56;
      const photoW = w - pad * 2;
      const gap = 22;
      const startY = by + bh + 50;
      const cellH = (h - startY - 60 - gap * 3) / 4;
      images.slice(0, 4).forEach((img, i) => {
        const y = startY + i * (cellH + gap);
        placePhoto(ctx, img, {
          x: pad,
          y,
          w: photoW,
          h: cellH,
          r: 10,
          shadow: false,
          filter: opt.filter,
        });
      });
    },
  },

  /* 6. SCRAPBOOK MEMORIES -------------------------------------------------- */
  {
    id: "memories",
    name: "Memories Box",
    desc: "3 foto tempel gaya scrapbook",
    emoji: "🗂️",
    photos: 3,
    accent: "#92400e",
    size: { w: 1040, h: 1560 },
    defaultCaption: "memories",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#efe6d3"],
        [1, "#ddcdb0"],
      ]);
      noiseDots(ctx, w, h, 120, ["#d8c6a4", "#cdb892"], [2, 7], 0.4, 21);

      // judul
      centerText(ctx, opt.caption || this.defaultCaption, 60, 130, "900 96px Georgia, serif", "#3b2f1e", { align: "left" });
      centerText(ctx, "BOX", w - 60, 130, "900 100px Georgia, serif", "#7a3b14", { align: "right" });

      const slots = [
        { x: 70, y: 210, w: 430, h: 360, rot: -3 },
        { x: 560, y: 320, w: 420, h: 470, rot: 3 },
        { x: 130, y: 720, w: 520, h: 700, rot: -2 },
      ];
      images.slice(0, 3).forEach((img, i) => {
        const s = slots[i];
        placePhoto(ctx, img, {
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          r: 4,
          border: 26,
          captionH: 36,
          rot: s.rot,
          shadow: true,
          filter: opt.filter,
        });
      });

      centerText(ctx, opt.date || "", w - 80, h - 60, "italic 500 34px Georgia, serif", "#5b4a30", { align: "right" });
    },
  },

  /* 7. PINK MANIS ---------------------------------------------------------- */
  {
    id: "pink-cute",
    name: "Pink Manis",
    desc: "Pastel pink dengan hati lucu",
    emoji: "💗",
    photos: 4,
    accent: "#ec4899",
    size: { w: 820, h: 2520 },
    defaultCaption: "So Sweet",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#ffd6e8"],
        [0.5, "#ffc2dd"],
        [1, "#ffb3d1"],
      ]);
      [[60, 70, 70], [w - 100, 130, 60], [40, h - 220, 64], [w - 80, h - 280, 80]].forEach(
        ([x, y, s]) => heart(ctx, x, y, s, "rgba(244,114,182,.5)")
      );
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 150, "italic 700 78px 'Brush Script MT', cursive", "#d6336c");
      vstrip(ctx, images, opt, {
        w,
        h,
        top: 220,
        footer: 110,
        pad: 72,
        count: 4,
        r: 26,
        border: 16,
        borderColor: "#ffffff",
        rot: (i) => (i % 2 ? 1.4 : -1.4),
        shadow: true,
      });
      centerText(ctx, opt.date || "", w / 2, h - 56, "600 30px Georgia, serif", "#d6336c", { letterSpacing: 4 });
    },
  },

  /* 8. HITAM ELEGAN -------------------------------------------------------- */
  {
    id: "hitam-elegan",
    name: "Hitam Elegan",
    desc: "Hitam mewah aksen emas",
    emoji: "🖤",
    photos: 4,
    accent: "#111111",
    size: { w: 800, h: 2480 },
    defaultCaption: "TIMELESS",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#0c0c0c");
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 4;
      ctx.strokeRect(22, 22, w - 44, h - 44);
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 112, "800 52px Georgia, serif", "#c9a227", { letterSpacing: 14 });
      vstrip(ctx, images, opt, {
        w,
        h,
        top: 162,
        footer: 110,
        pad: 64,
        count: 4,
        r: 6,
        border: 6,
        borderColor: "#c9a227",
      });
      centerText(ctx, opt.date || "", w / 2, h - 58, "500 28px Georgia, serif", "#c9a227", { letterSpacing: 8 });
    },
  },

  /* 9. MERAH CINTA --------------------------------------------------------- */
  {
    id: "merah-cinta",
    name: "Merah Cinta",
    desc: "Merah romantis penuh hati",
    emoji: "❤️",
    photos: 3,
    accent: "#dc2626",
    size: { w: 840, h: 2080 },
    defaultCaption: "With Love",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#b91c1c"],
        [0.5, "#dc2626"],
        [1, "#7f1d1d"],
      ]);
      noiseDots(ctx, w, h, 40, ["#ffffff", "#fecaca"], [3, 9], 0.3, 9);
      [[70, 80, 80], [w - 110, 150, 64], [60, h - 180, 72]].forEach(([x, y, s]) =>
        heart(ctx, x, y, s, "rgba(255,255,255,.32)")
      );
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 158, "italic 700 82px 'Brush Script MT', cursive", "#ffffff");
      vstrip(ctx, images, opt, {
        w,
        h,
        top: 230,
        footer: 120,
        pad: 84,
        count: 3,
        r: 20,
        border: 16,
        borderColor: "#ffffff",
        shadow: true,
      });
      centerText(ctx, opt.date || "", w / 2, h - 58, "600 30px Georgia, serif", "#fee2e2", { letterSpacing: 4 });
    },
  },

  /* 10. GRID CERIA (2x2) --------------------------------------------------- */
  {
    id: "grid-ceria",
    name: "Grid Ceria",
    desc: "Kotak 2x2 warna-warni",
    emoji: "🌈",
    photos: 4,
    accent: "#8b5cf6",
    size: { w: 1100, h: 1240 },
    defaultCaption: "Good Vibes",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#fef08a"],
        [0.33, "#fca5a5"],
        [0.66, "#a5b4fc"],
        [1, "#6ee7b7"],
      ]);
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 92, "900 66px Georgia, serif", "#1f2937");
      const pad = 70;
      const top = 130;
      const footer = 90;
      const gap = 26;
      const colW = (w - pad * 2 - gap) / 2;
      const rowH = (h - top - footer - gap) / 2;
      const colors = ["#ec4899", "#8b5cf6", "#f59e0b", "#10b981"];
      images.slice(0, 4).forEach((img, i) => {
        const c = i % 2;
        const r = Math.floor(i / 2);
        placePhoto(ctx, img, {
          x: pad + c * (colW + gap),
          y: top + r * (rowH + gap),
          w: colW,
          h: rowH,
          r: 18,
          border: 14,
          borderColor: colors[i],
          shadow: true,
          filter: opt.filter,
        });
      });
      centerText(ctx, opt.date || "", w / 2, h - 42, "600 28px Georgia, serif", "#374151", { letterSpacing: 4 });
    },
  },

  /* 11. BINTANG UNGU ------------------------------------------------------- */
  {
    id: "bintang-ungu",
    name: "Bintang Ungu",
    desc: "Ungu galaksi penuh bintang",
    emoji: "⭐",
    photos: 4,
    accent: "#7c3aed",
    size: { w: 820, h: 2520 },
    defaultCaption: "Shine Bright",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#6d28d9"],
        [0.5, "#7c3aed"],
        [1, "#4c1d95"],
      ]);
      [[60, 90, 26], [w - 80, 130, 20], [50, h - 180, 22], [w - 70, h - 220, 28], [w / 2, 64, 18]].forEach(
        ([x, y, s]) => star(ctx, x, y, 5, s, s * 0.45, "rgba(253,224,71,.85)")
      );
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 158, "italic 800 72px 'Brush Script MT', cursive", "#fde047");
      vstrip(ctx, images, opt, {
        w,
        h,
        top: 220,
        footer: 110,
        pad: 72,
        count: 4,
        r: 20,
        border: 14,
        borderColor: "#ffffff",
        shadow: true,
      });
      centerText(ctx, opt.date || "", w / 2, h - 54, "600 28px Georgia, serif", "#e9d5ff", { letterSpacing: 4 });
    },
  },

  /* 12. MINT SEGAR --------------------------------------------------------- */
  {
    id: "mint-segar",
    name: "Mint Segar",
    desc: "Hijau mint kalem & manis",
    emoji: "🌿",
    photos: 4,
    accent: "#10b981",
    size: { w: 820, h: 2520 },
    defaultCaption: "Fresh Day",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBgStops(ctx, w, h, [
        [0, "#d1fae5"],
        [0.5, "#a7f3d0"],
        [1, "#6ee7b7"],
      ]);
      noiseDots(ctx, w, h, 50, ["#ffffff", "#34d399"], [3, 9], 0.4, 23);
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 150, "italic 700 74px 'Brush Script MT', cursive", "#047857");
      vstrip(ctx, images, opt, {
        w,
        h,
        top: 210,
        footer: 110,
        pad: 72,
        count: 4,
        r: 22,
        border: 16,
        borderColor: "#ffffff",
        rot: (i) => (i % 2 ? -1 : 1),
        shadow: true,
      });
      centerText(ctx, opt.date || "", w / 2, h - 56, "600 30px Georgia, serif", "#047857", { letterSpacing: 4 });
    },
  },

  /* 13. NEON MALAM --------------------------------------------------------- */
  {
    id: "neon-malam",
    name: "Neon Malam",
    desc: "Hitam neon pink & cyan",
    emoji: "🌃",
    photos: 4,
    accent: "#f472b6",
    size: { w: 800, h: 2480 },
    defaultCaption: "NIGHT OUT",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#0a0a12");
      // bingkai neon
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 30;
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 6;
      ctx.strokeRect(26, 26, w - 52, h - 52);
      ctx.shadowColor = "#f472b6";
      ctx.strokeStyle = "#f472b6";
      ctx.strokeRect(40, 40, w - 80, h - 80);
      ctx.restore();
      ctx.save();
      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 24;
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 120, "900 56px 'Trebuchet MS', sans-serif", "#f472b6", { letterSpacing: 10 });
      ctx.restore();
      vstrip(ctx, images, opt, {
        w,
        h,
        top: 170,
        footer: 110,
        pad: 70,
        count: 4,
        r: 12,
        border: 8,
        borderColor: "#22d3ee",
      });
      centerText(ctx, opt.date || "", w / 2, h - 58, "600 28px 'Trebuchet MS', sans-serif", "#22d3ee", { letterSpacing: 8 });
    },
  },

  /* 14. HARI SPESIAL (foto bentuk hati) ----------------------------------- */
  {
    id: "hati-kuning",
    name: "Hari Spesial",
    desc: "Foto bentuk hati + bunga matahari",
    emoji: "💛",
    photos: 4,
    accent: "#eab308",
    size: { w: 780, h: 2000 },
    defaultCaption: "Today is a Special day!",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#fdf3d3");
      gridPaper(ctx, w, h, 40, "rgba(234,179,8,.16)");

      centerText(ctx, opt.caption || this.defaultCaption, w / 2, 130, "800 56px 'Trebuchet MS', sans-serif", "#6b4f1d");

      const top = 210;
      const bottom = 70;
      const gap = 12;
      const count = 4;
      const cellH = (h - top - bottom - gap * (count - 1)) / count;
      const hw = Math.min(w - 150, cellH * 1.15);
      images.slice(0, 4).forEach((img, i) => {
        placePhoto(ctx, img, {
          x: (w - hw) / 2,
          y: top + i * (cellH + gap),
          w: hw,
          h: cellH,
          shape: "heart",
          shadow: false,
          filter: opt.filter,
        });
      });

      // bunga matahari + kilau di sisi
      flower(ctx, 70, top + cellH * 1.2, 38, "#f59e0b", "#92400e");
      flower(ctx, w - 64, top + cellH * 1.9, 32, "#f59e0b", "#92400e");
      flower(ctx, w - 80, h - 90, 44, "#f59e0b", "#92400e");
      flower(ctx, 64, h - 120, 30, "#f59e0b", "#92400e");
      star(ctx, w - 70, top + 50, 4, 20, 7, "#fbbf24");
      star(ctx, 78, top + cellH * 2.4, 4, 16, 6, "#fbbf24");
      star(ctx, w - 90, top + cellH * 3.1, 4, 14, 5, "#fbbf24");

      centerText(ctx, opt.date || "", w / 2, h - 26, "600 26px 'Trebuchet MS', sans-serif", "#92702a", { letterSpacing: 3 });
    },
  },

  /* 15. RETRO FRIENDS (grid 6 foto) --------------------------------------- */
  {
    id: "retro-friends",
    name: "Retro Friends",
    desc: "Grid 6 foto vintage gelap",
    emoji: "📺",
    photos: 6,
    accent: "#fde047",
    size: { w: 860, h: 1280 },
    defaultCaption: "friends",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#141210");
      const pad = 26;
      const gap = 14;
      const cols = 2;
      const rows = 3;
      const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
      const ch = (h - pad * 2 - gap * (rows - 1)) / rows;
      images.slice(0, 6).forEach((img, i) => {
        placePhoto(ctx, img, {
          x: pad + (i % cols) * (cw + gap),
          y: pad + Math.floor(i / cols) * (ch + gap),
          w: cw,
          h: ch,
          r: cw * 0.13,
          shadow: false,
          filter: opt.filter,
        });
      });
      heart(ctx, w / 2 - 52, h / 2 - 96, 30, "#fde047");
      heart(ctx, w / 2 + 22, h / 2 - 96, 30, "#fde047");
      centerText(ctx, opt.caption || this.defaultCaption, w / 2, h / 2 + 14, "italic 800 78px 'Brush Script MT', cursive", "#fde047", {
        shadow: "#000",
        shadowBlur: 14,
      });
    },
  },

  /* 16. WEEKEND RECAP (kolase + stiker judul) ----------------------------- */
  {
    id: "weekend-recap",
    name: "Weekend Recap",
    desc: "Kolase 4 foto + label warna-warni",
    emoji: "🌿",
    photos: 4,
    accent: "#16a34a",
    size: { w: 820, h: 1460 },
    defaultCaption: "WEEKEND",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      const imgs = images.slice(0, 4);
      const half = w / 2;
      const halfH = h / 2;
      placePhoto(ctx, imgs[0], { x: 0, y: 0, w: half, h: halfH, r: 0, shadow: false, filter: opt.filter });
      placePhoto(ctx, imgs[1], { x: 0, y: halfH, w: half, h: halfH, r: 0, shadow: false, filter: opt.filter });
      placePhoto(ctx, imgs[2], { x: half, y: 0, w: half, h: halfH, r: 0, shadow: false, filter: opt.filter });
      placePhoto(ctx, imgs[3], { x: half, y: halfH, w: half, h: halfH, r: 0, shadow: false, filter: opt.filter });

      // garis sobek diagonal putih
      ctx.save();
      ctx.fillStyle = "#fffdf5";
      ctx.beginPath();
      const steps = 26;
      ctx.moveTo(w * 0.6, 0);
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const y = t * h;
        const baseX = w * 0.6 - t * 0.18 * w + (i % 2 ? 12 : -12);
        ctx.lineTo(baseX, y);
      }
      for (let i = steps; i >= 0; i -= 1) {
        const t = i / steps;
        const y = t * h;
        const baseX = w * 0.52 - t * 0.18 * w + (i % 2 ? 12 : -12);
        ctx.lineTo(baseX, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // label judul sticker
      ctx.save();
      ctx.translate(w / 2, h * 0.46);
      ctx.rotate(-3 * DEG);
      ctx.fillStyle = "#3fae5a";
      roundRect(ctx, -130, -42, 260, 64, 16);
      ctx.fill();
      centerText(ctx, opt.caption || this.defaultCaption, 0, -2, "800 40px 'Trebuchet MS', sans-serif", "#ffffff", { letterSpacing: 2, maxWidth: 232 });
      ctx.restore();
      multiText(ctx, "RECAP", w / 2, h * 0.53, "900 86px Georgia, serif", ["#e11d48", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed"], 6);

      centerText(ctx, opt.date || "", w / 2, h - 28, "700 26px 'Trebuchet MS', sans-serif", "#ffffff", { shadow: "#000", shadowBlur: 8 });
    },
  },

  /* 17. SUNDAY SCRAPBOOK (kertas grid + stiker) --------------------------- */
  {
    id: "sunday-scrap",
    name: "Sunday Scrapbook",
    desc: "Kertas grid + stiker lucu (2 foto)",
    emoji: "🍓",
    photos: 2,
    accent: "#b91c1c",
    size: { w: 860, h: 1520 },
    defaultCaption: "Friends make the world beautiful",
    render(ctx, images, opt = {}) {
      const { w, h } = this.size;
      fillBg(ctx, w, h, "#f4f2e8");
      gridPaper(ctx, w, h, 34, "rgba(120,130,150,.16)");

      placePhoto(ctx, images[0], { x: 250, y: 180, w: 440, h: 370, r: 6, border: 24, captionH: 26, rot: 3, shadow: true, filter: opt.filter });
      placePhoto(ctx, images[1], { x: 120, y: 700, w: 440, h: 360, r: 6, border: 24, captionH: 26, rot: -3, shadow: true, filter: opt.filter });

      // stiker hati
      heart(ctx, w - 170, 150, 130, "#b91c1c");
      // stroberi
      strawberry(ctx, 90, 170, 46);
      strawberry(ctx, 160, 280, 38);
      // tiket ADMIT ONE
      ctx.save();
      ctx.translate(120, 560);
      ctx.rotate(-6 * DEG);
      ctx.fillStyle = "#e7e3d4";
      ctx.strokeStyle = "#b91c1c";
      ctx.lineWidth = 3;
      roundRect(ctx, -90, -34, 180, 68, 6);
      ctx.fill();
      ctx.stroke();
      centerText(ctx, "ADMIT ONE", 0, 0, "800 24px Georgia, serif", "#3b4a6b", { letterSpacing: 2 });
      ctx.restore();
      // label SUNDAY
      ctx.save();
      ctx.translate(w - 170, 700);
      ctx.rotate(-4 * DEG);
      ctx.fillStyle = "#3b4a6b";
      roundRect(ctx, -95, -28, 190, 56, 8);
      ctx.fill();
      centerText(ctx, "SUNDAY", 0, 0, "800 30px Georgia, serif", "#ffffff", { letterSpacing: 4 });
      ctx.restore();

      centerText(ctx, opt.caption || this.defaultCaption, w / 2, h - 170, "italic 600 40px 'Brush Script MT', cursive", "#3b4a6b");
      centerText(ctx, opt.date || "", w / 2, h - 110, "600 26px Georgia, serif", "#6b7280", { letterSpacing: 3 });
    },
  },
];

// helper kecil (didefinisikan setelah dipakai karena hoisting fn declaration)
function fillBg2(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

/**
 * Compose template ke dataURL.
 * @param {object} template
 * @param {HTMLImageElement[]} images
 * @param {{filter?:string, caption?:string, date?:string}} opt
 * @param {HTMLCanvasElement} [canvasEl] kanvas opsional (reuse)
 * @returns {string} dataURL jpeg
 */
export function composeTemplate(template, images, opt = {}, canvasEl) {
  const canvas = canvasEl || document.createElement("canvas");
  canvas.width = template.size.w;
  canvas.height = template.size.h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textRendering = "optimizeLegibility";
  // bungkus tiap foto dengan transform (zoom/geser) per slot bila tersedia
  const transforms = opt.transforms || [];
  const wrapped = images.map((img, i) => ({ img: img || null, t: transforms[i] || null }));
  // batas lebar teks otomatis agar judul (default/custom) tidak meluber
  currentMaxTextWidth = template.size.w * 0.86;
  currentBgOverride = opt.bg || null;
  try {
    template.render(ctx, wrapped, opt);
  } finally {
    currentMaxTextWidth = null;
    currentBgOverride = null;
  }
  return canvas.toDataURL("image/jpeg", 0.95);
}

/** Judul default untuk semua bingkai (bisa di-custom oleh user). */
export const MAIN_TITLE = "Hari Jadi Bogor ke-544";

/** Filter foto (CSS filter strings). */
export const PHOTO_FILTERS = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "bw", label: "Hitam Putih", css: "grayscale(1) contrast(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(.45) saturate(.9) contrast(1.05)" },
  { id: "cinematic", label: "Sinematik", css: "contrast(1.18) saturate(1.25) brightness(.92)" },
  { id: "soft", label: "Soft", css: "brightness(1.06) saturate(.88) contrast(.92)" },
  { id: "beauty", label: "Beauty", css: "brightness(1.1) saturate(1.05)" },
  { id: "boost", label: "Color Pop", css: "saturate(1.55) contrast(1.08)" },
];

export function getFilterCss(id) {
  return (PHOTO_FILTERS.find((f) => f.id === id) || PHOTO_FILTERS[0]).css;
}
