// 互动粒子流星雨（移动端友好）— 布局版
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d', { alpha: true });

  // DPR & 画布
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

  // 控件引用
  const els = {
    count: document.getElementById('count'),
    freq:  document.getElementById('freq'),
    trail: document.getElementById('trail'),
    vCount: document.getElementById('val-count'),
    vFreq:  document.getElementById('val-freq'),
    vTrail: document.getElementById('val-trail'),
    panel: document.getElementById('controls'),
  };

  const params = {
    count: +els.count.value || 1600,
    freq:  +els.freq.value  || 1.2,   // interval = freq * 600 ms
    trail: +els.trail.value || 0.9,   // 显示为 0~100 的长度感
  };

  // 数值显示
  function renderVals(){
    els.vCount.textContent = params.count;
    els.vFreq.textContent  = Math.round(params.freq * 600) + 'ms';
    els.vTrail.textContent = Math.round(params.trail * 100);
  }
  renderVals();

  // 绑定滑块
  function bind(el, key, clamp){
    const apply = (v)=>{
      v = clamp(+v);
      params[key] = v;
      el.value = v;
      if(key==='count') syncStarCount();
      renderVals();
    };
    el.addEventListener('input', e=>apply(e.target.value), { passive:true });
  }
  bind(els.count, 'count', v=>Math.max(200, Math.min(5000, v|0)));
  bind(els.freq,  'freq',  v=>Math.max(0.2, Math.min(3, v)));
  bind(els.trail, 'trail', v=>Math.max(0.6, Math.min(0.98, v)));

  // 面板阻止事件冒泡到画布（不阻止默认行为）
  ['pointerdown','pointerup','touchstart','touchend'].forEach(t=>{
    els.panel?.addEventListener(t, e => e.stopPropagation(), { passive:true });
  });

  // 星星
  const stars = [];
  function makeStar(){ return {
    x: Math.random()*W,
    y: Math.random()*H,
    r: (Math.random()*0.6 + 0.7) * DPR,
    hue: 200 + Math.random()*40,
    tw: Math.random()*Math.PI*2,
    twSpeed: (0.5 + Math.random())*0.002,
  }; }
  function syncStarCount(){
    const t = params.count|0;
    if(stars.length<t) for(let i=stars.length;i<t;i++) stars.push(makeStar());
    else stars.length = t;
  }
  syncStarCount();

  // 流星
  const meteors = [];
  function spawnMeteor(x,y,vx,vy){
    const speed = (1.5 + Math.random()*1.5) * DPR;
    const len = 80 + Math.random()*120;
    meteors.push({
      x: x ?? (Math.random()<0.5 ? -50 : W+50),
      y: y ?? (Math.random()*H*0.6),
      vx: vx ?? (Math.random()<0.5 ? speed : -speed),
      vy: vy ?? (speed * (Math.random()*0.2 - 0.6)),
      len, w: 2*DPR, life:0, hue: 195 + Math.random()*20
    });
  }
  let spawnTimer = 0;
  function maybeSpawn(dt){
    const interval = params.freq * 600;
    spawnTimer += dt;
    while(spawnTimer >= interval){ spawnMeteor(); spawnTimer -= interval; }
  }

  // 手势流星
  let dragging=false,lastX=0,lastY=0;
  canvas.addEventListener('pointerdown', e=>{
    dragging=true; lastX=e.clientX*DPR; lastY=e.clientY*DPR;
    try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  }, {passive:true});
  canvas.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const x=e.clientX*DPR,y=e.clientY*DPR,dx=x-lastX,dy=y-lastY;
    lastX=x; lastY=y;
    if(dx*dx+dy*dy>9) spawnMeteor(x,y,dx*0.25,dy*0.25);
  }, {passive:true});
  canvas.addEventListener('pointerup', ()=>dragging=false, {passive:true});

  // 绘制
  function drawStar(s){
    const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.2);
    const a=0.75+Math.sin(s.tw)*0.25;
    const col=`hsla(${s.hue},100%,88%,`;
    g.addColorStop(0.0, col+(0.95*a)+')');
    g.addColorStop(0.4, col+(0.65*a)+')');
    g.addColorStop(1.0, col+'0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.2,0,Math.PI*2); ctx.fill();
  }
  function drawMeteor(m){
    const ang=Math.atan2(m.vy,m.vx);
    const x1=m.x-Math.cos(ang)*m.len;
    const y1=m.y-Math.sin(ang)*m.len;
    const grad=ctx.createLinearGradient(x1,y1,m.x,m.y);
    grad.addColorStop(0, `hsla(${m.hue},100%,80%,0)`);
    grad.addColorStop(0.4, `hsla(${m.hue},100%,80%,0.25)`);
    grad.addColorStop(1, `hsla(${m.hue},100%,90%,0.95)`);
    ctx.strokeStyle=grad; ctx.lineWidth=m.w; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(m.x,m.y); ctx.stroke();
  }

  // 动画
  let lastT=performance.now();
  function tick(now){
    const dt=Math.min(50, now-lastT); lastT=now;

    // 拖影：透明度 = 1 - trail
    const fade = 1 - params.trail;
    ctx.save(); ctx.globalAlpha=fade; ctx.fillStyle='black';
    ctx.fillRect(0,0,W,H); ctx.restore();

    for(let i=0;i<stars.length;i++){ const s=stars[i]; s.tw+=s.twSpeed*dt; drawStar(s); }

    maybeSpawn(dt);
    for(let i=meteors.length-1;i>=0;i--){
      const m=meteors[i];
      m.x += m.vx*(dt*0.06);
      m.y += m.vy*(dt*0.06);
      m.life += dt;
      drawMeteor(m);
      if(m.x<-200||m.x>W+200||m.y<-200||m.y>H+200||m.life>5000) meteors.splice(i,1);
    }

    requestAnimationFrame(tick);
  }
  ctx.fillStyle='black'; ctx.fillRect(0,0,W,H);
  requestAnimationFrame(tick);
});
