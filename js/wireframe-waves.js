// wireframe-waves.js
(function () {
  const waveLayerEl = document.getElementById('waveLayer');
  const waveCanvas = document.getElementById('waveCanvas');
  if (!waveLayerEl || !waveCanvas) return;

  const ctx = waveCanvas.getContext('2d');
  let waveTime = 0;
  let wavesOn = false;
  let animId = null;

  function resize() {
    const rect = waveLayerEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    waveCanvas.width = rect.width * dpr;
    waveCanvas.height = rect.height * dpr;
    waveCanvas.style.width = rect.width + 'px';
    waveCanvas.style.height = rect.height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWireframe() {
    const dpr = window.devicePixelRatio || 1;
    const w = waveCanvas.width / dpr;
    const h = waveCanvas.height / dpr;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    const layers = 11;
    const centerX = w / 2;
    ctx.lineWidth = 1;

    for (let i = 0; i < layers; i++) {
      const depth = i / (layers - 1);
      const scale = 1 - depth * 0.65;
      const alpha = 0.15 + (1 - depth) * 0.35;
      const yBase = h * (0.2 + depth * 0.7);
      const amplitude = 18 * scale;
      const segments = 64;

      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;

      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const tNorm = s / segments;
        const worldX = (tNorm - 0.5) * 2;
        const x = centerX + worldX * (w * 0.45) * scale;
        const phase = waveTime * 1.4 + depth * 4 + tNorm * Math.PI * 4;
        const y = yBase + Math.sin(phase) * amplitude;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (i < layers - 1) {
        const nextDepth = (i + 1) / (layers - 1);
        const nextScale = 1 - nextDepth * 0.65;
        const nextYBase = h * (0.2 + nextDepth * 0.7);
        const nextAmp = 18 * nextScale;

        ctx.beginPath();
        const columns = 12;
        for (let c = 0; c <= columns; c++) {
          const tNorm = c / columns;
          const worldX = (tNorm - 0.5) * 2;
          const x = centerX + worldX * (w * 0.45) * scale;
          const phase1 = waveTime * 1.4 + depth * 4 + tNorm * Math.PI * 4;
          const phase2 = waveTime * 1.4 + nextDepth * 4 + tNorm * Math.PI * 4;
          const y1 = yBase + Math.sin(phase1) * amplitude;
          const y2 = nextYBase + Math.sin(phase2) * nextAmp;
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
        }
        ctx.stroke();
      }
    }
  }

  function loop() {
    animId = requestAnimationFrame(loop);
    if (!wavesOn) return;
    waveTime += 0.016;
    drawWireframe();
  }

  // Инициализация
  resize();
  loop();
  window.addEventListener('resize', resize);

  // Привязка к тому же LED, что включает/выключает общий motion
  const led = document.getElementById('blinkToggle');
  if (led) {
    led.addEventListener('click', () => {
      wavesOn = !wavesOn;

      if (wavesOn) {
        waveLayerEl.classList.remove('motion-off');
      } else {
        waveLayerEl.classList.add('motion-off');
        // можно не чистить canvas, слой и так прозрачен
      }
    });
  }
})();
