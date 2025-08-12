// 互动粒子流星雨 - 移动端触屏友好
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d', { alpha: true });

  // 高分屏支持（上限 2x，省电）
  let DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let W = 0, H = 0;
  function resize() {
    DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    W = Math.floor(window.innerWidth * DPR);
    H = Math.floor(window.innerHeight * DPR);
    canvas.width = W; canvas.height = H;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ---------------- 控件参数 ----------------
  const els = {
    count:     document.getElementById('count'),
    countNum:  document.getElementById('countNum'),
    freq:      document.getElementById('freq'),
    freqNum:   document.getElementById('freqNum'),
    trail:     document.getElementById('trail'),
    trailNum:  document.getElementById('trailNum'),
    panel:     document.getElementById('controls'),
  };

  const params = {
    count:  +els.count?.value   || 1600, // 星星数量
    // 频率：越小越快 -> 转换为生成间隔(ms) = freq * 600
    freq:   +els.freq?.value    || 1.2,
    // 尾巴长度：0.6~0.98 -> 每帧覆盖透明度 = 1 - trail
    trail:  +els.trail?.value   || 0.9,
  };

  // 双向联动（触屏用 input 事件；不全局 preventDefault）
  function link(a, b, key, clamp) {
    const apply = (v) => {
      v = clamp(+v);
      params[key] = v;
      a.value = v; b.value = v;
      if (key === 'count') syncStarCount();
    };
    a?.addEventListener('input', e => apply(e.target.value), { passive: true });
    b?.addEventListener('input', e => apply(e.target.value), { passive: true });
  }
  link(els.count, els.countNum, 'count', v => Math.max(200, Math.min(5000, v|0)));
  link(els.freq,  els.freqNum,  'freq',  v => Math.max(0.2, Math.min(3, v)));
  link(els.trail, els.trailNum, 'trail', v => Math.max(0.6, Math.min(0.98, v)));

  // 面板阻止事件冒泡到画布（不阻止默认行为，滑块可拖）
  ['pointerdown','pointerup','touchstart','touchend'].forEach(t=>{
    els.panel?.addEventListener(t, e => e.stopPropagation(), { passive:true });
  });

  // ---------------- 星星 & 流星 ----------------
  const stars = [];
  function makeStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: (Math.random() * 0.6 + 0.7) * DPR,
      hue: 200 + Math.random() * 40,
      tw: Math.random() * Math.PI * 2,
      twSpeed: (0.5 + Math.random()) * 0.002,
    };
  }
  function syncStarCount() {
    const target = params.count | 0;
    if (stars.length < target) {
      for (let i = stars.length; i < target; i++) stars.push(makeStar());
    } else stars.length = target;
  }
  syncStarCount();

  // 流星
  const meteors = [];
  function spawnMeteor(x, y, vx, vy) {
    const speed = (1.5 + Math.random() * 1.5) * DPR;
    const len = 80 + Math.random() * 120; // 物理长度（用于尾部渐变）
    const angle = Math.atan2(vy, vx);
    meteors.push({
      x: x ?? (Math.random() < 0.5 ? -50 : W + 50),
      y: y ?? (Math.random() * H * 0.6),
      vx: vx ?? (Math.random() < 0.5 ? speed : -speed),
      vy: vy ?? (speed * (Math.random()*0.2 - 0.6)), // 稍微向下
      len,
      w: 2.0 * DPR, // 线宽
      life: 0,
      hue: 195 + Math.random()*20
    });
  }

  let spawnTimer = 0;
  function maybeSpawn(dt) {
    const interval = params.freq * 600; // ms
    spawnTimer += dt;
    while (spawnTimer >= interval) {
      spawnMeteor();
      spawnTimer -= interval;
    }
  }

  // 指针轨迹上生成“手势流星”
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX * DPR; lastY = e.clientY * DPR;
    try { canvas.setPointerCapture(e.pointerId); } catch(_) {}
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const x = e.clientX * DPR, y = e.clientY * DPR;
    const dx = x - lastX, dy = y - lastY;
    lastX = x; lastY = y;
    // 沿指尖方向生成一颗更短更亮的流星
    if (dx*dx + dy*dy > 9) {
      spawnMeteor(x, y, dx*0.25, dy*0.25);
    }
  }, { passive: true });

  canvas.addEventListener('pointerup', () => dragging = false, { passive: true });

  // ---------------- 绘制 ----------------
  function drawStar(s) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
    const a = 0.75 + Math.sin(s.tw) * 0.25; // twinkle
    const col = `hsla(${s.hue}, 100%, 88%, `;
    g.addColorStop(0.0, col + (0.95*a) + ')');
    g.addColorStop(0.4, col + (0.65*a) + ')');
    g.addColorStop(1.0, col + '0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r*2.2, 0, Math.PI*2); ctx.fill();
  }

  function drawMeteor(m) {
    // 头部位置
    const x2 = m.x;
    const y2 = m.y;
    // 尾部方向：反向 len
    const ang = Math.atan2(m.vy, m.vx);
    const x1 = x2 - Math.cos(ang) * m.len;
    const y1 = y2 - Math.sin(ang) * m.len;

    // 尾巴渐变
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, `hsla(${m.hue},100%,80%,0)`);
    grad.addColorStop(0.4, `hsla(${m.hue},100%,80%,0.25)`);
    grad.addColorStop(1, `hsla(${m.hue},100%,90%,0.95)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = m.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // ---------------- 动画主循环 ----------------
  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(50, now - lastT);
    lastT = now;

    // 拖影：每帧用半透明黑覆盖，透明度 = 1 - trail
    const fade = 1 - params.trail;        // 0.02 ~ 0.4
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 星星（静态 twinkle）
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.tw += s.twSpeed * dt;
      drawStar(s);
    }

    // 生成与更新流星
    maybeSpawn(dt);

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * (dt * 0.06);
      m.y += m.vy * (dt * 0.06);
      m.life += dt;

      drawMeteor(m);

      // 出界或太久则回收
      if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200 || m.life > 5000) {
        meteors.splice(i, 1);
      }
    }

    requestAnimationFrame(tick);
  }
  // 先铺一层黑，避免第一帧透明
  ctx.fillStyle = 'black'; ctx.fillRect(0,0,W,H);
  requestAnimationFrame(tick);
});
