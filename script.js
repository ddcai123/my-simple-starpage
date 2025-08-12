// script.js  ——  移动端触屏友好的星空交互
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d', { alpha: true });

  // 高分屏支持：限制到 2x 以省电
  let DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let W = 0, H = 0;

  function resize() {
    DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    W = Math.floor(window.innerWidth * DPR);
    H = Math.floor(window.innerHeight * DPR);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // --- 控件 & 参数 ---
  const els = {
    count: document.getElementById('count'),
    countNum: document.getElementById('countNum'),
    size: document.getElementById('size'),
    sizeNum: document.getElementById('sizeNum'),
    speed: document.getElementById('speed'),
    speedNum: document.getElementById('speedNum'),
    twinkle: document.getElementById('twinkle'),
    twinkleNum: document.getElementById('twinkleNum'),
    reset: document.getElementById('resetBtn'),
    panel: document.getElementById('controls'),
  };

  const params = {
    count: +els.count.value || 1200,
    size: +els.size.value || 1.4,
    speed: +els.speed.value || 0.15,
    twinkle: +els.twinkle.value || 0.5,
  };

  // 将两个控件（range/number）与同一参数联动
  function link(a, b, key, clamp) {
    const apply = (v) => {
      v = clamp(+v);
      params[key] = v;
      a.value = v;
      b.value = v;
      if (key === 'count') syncStarCount();
    };
    a.addEventListener('input', (e) => apply(e.target.value), { passive: true });
    b.addEventListener('input', (e) => apply(e.target.value), { passive: true });
  }

  link(els.count, els.countNum, 'count', v => Math.max(100, Math.min(4000, v|0)));
  link(els.size, els.sizeNum, 'size', v => Math.max(0.5, Math.min(3, v)));
  link(els.speed, els.speedNum, 'speed', v => Math.max(0, Math.min(1, v)));
  link(els.twinkle, els.twinkleNum, 'twinkle', v => Math.max(0, Math.min(1, v)));

  els.reset.addEventListener('click', () => {
    [['count',1200],['size',1.4],['speed',0.15],['twinkle',0.5]].forEach(([k,v])=>{
      params[k]=v; els[k].value=v; els[k+'Num'].value=v;
    });
    syncStarCount();
  });

  // 重要：面板上允许默认浏览器行为（滑块拖动），只阻止事件冒泡到 canvas
  ['pointerdown','pointerup','touchstart','touchend'].forEach(t=>{
    els.panel?.addEventListener(t, e => e.stopPropagation(), { passive:true });
  });

  // --- 星空数据 ---
  const stars = [];

  function makeStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: (Math.random()*0.6 + 0.7) * params.size * DPR,
      hue: 200 + Math.random()*40, // 偏蓝白
      tw: Math.random() * Math.PI * 2,
      twSpeed: (0.5 + Math.random()) * 0.002,
      vx: (Math.random() - 0.5),
      vy: (Math.random() - 0.5),
    };
  }

  function syncStarCount() {
    const target = params.count | 0;
    if (stars.length < target) {
      for (let i = stars.length; i < target; i++) stars.push(makeStar());
    } else if (stars.length > target) {
      stars.length = target;
    }
  }
  syncStarCount();

  function drawStar(s) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
    const a = 0.75 + Math.sin(s.tw) * 0.25 * params.twinkle;
    const col = `hsla(${s.hue}, 100%, 88%, `;
    g.addColorStop(0.0, col + (0.95 * a) + ')');
    g.addColorStop(0.4, col + (0.65 * a) + ')');
    g.addColorStop(1.0, col + '0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 动画 ---
  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(50, now - lastT); // 限制最大步长
    lastT = now;

    // 轻薄清屏；若想更强拖影，可改成：ctx.globalAlpha=0.88; 填充一层黑色再还原
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      // twinkle
      s.tw += s.twSpeed * dt;

      // 位移（速度随参数缩放）
      const speedScale = params.speed * 0.12 * dt;
      s.x += (s.vx || 0) * speedScale;
      s.y += (s.vy || 0) * speedScale;

      // 越界循环
      if (s.x < -5) s.x = W + 5; else if (s.x > W + 5) s.x = -5;
      if (s.y < -5) s.y = H + 5; else if (s.y > H + 5) s.y = -5;

      // 偶尔改变方向，让画面灵动
      if (Math.random() < 0.002) {
        s.vx = (Math.random() - 0.5);
        s.vy = (Math.random() - 0.5);
      }

      drawStar(s);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // --- 交互：在画布上拖动以改变整体漂移方向 ---
  let dragging = false, lastPX = 0, lastPY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastPX = e.clientX; lastPY = e.clientY;
    // 捕获指针，手指/鼠标可离开画布继续跟踪
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastPX) * 0.002;
    const dy = (e.clientY - lastPY) * 0.002;
    lastPX = e.clientX; lastPY = e.clientY;

    for (let i = 0; i < stars.length; i++) {
      stars[i].vx += dx;
      stars[i].vy += dy;
    }
  }, { passive: true });

  canvas.addEventListener('pointerup', () => { dragging = false; }, { passive: true });

});
