/* ============================================================================
 * CryptoTextEngine
 * Минимальный, но параметрический генератор динамики цифровой типографики
 * в стиле "animated motion crypto decrypt cyphers by hackers IDE AI in Terminal".
 *
 * Основные идеи:
 *  - цикл по массиву строк (радиодиаапазоны / логи);
 *  - плавный reveal + fade-out с кривой smoothstep;
 *  - вероятностный crypto-glitch поверх видимого текста;
 *  - опциональная аудио-синхронизация через getEnergy() → [0..1];
 *  - управление параметрами через setControl().
 * ========================================================================== */

export class CryptoTextEngine {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.element   DOM-элемент, куда выводится текст
   * @param {string[]}   [options.lines]   Набор строк (будут крутиться по кругу)
   * @param {number}     [options.duration] Длительность одной строки в секундах
   * @param {Function}   [options.getEnergy] Функция () => number в диапазоне 0..1 (энергия аудио/EQ)
   * @param {Object}     [options.controls] Начальные параметры (textSpeed, textGlitch)
   */
  constructor(options = {}) {
    this.el = options.element || null;
    if (!this.el) {
      throw new Error('CryptoTextEngine: options.element обязателен');
    }

    this.lines = Array.isArray(options.lines) && options.lines.length
      ? options.lines.slice()
      : [
          'ABSTRACT HACKERS RADIO // CHANNEL: 0x1F | MODE: LIQUID BLUEPRINT EQ',
          'STREAM ROUTING: WEB_RADIO ⇒ TERMINAL_UI ⇒ LIQUID_EQUALIZER ⇒ LISTENER',
          'NO AUDIO INPUT BOUND — SYNTHETIC PROBABILISTIC EQ MODE',
          'SESSION LOG: WIREFRAME GRID ACTIVE / PARTICLE FEED REROUTED TO EQ',
          'SCANNING PORTS 8000–8100 FOR LIVE STREAM ENDPOINTS…',
          'PIPELINE: GRID_OSCILLATOR × PARTICLE_FIELD × CRYPTO_TYPING_ENGINE'
        ];

    this.duration = typeof options.duration === 'number' && options.duration > 0
      ? options.duration
      : 11.0; // сек на строку

    // callback для аудио-энергии (если нет — движок работает автономно)
    this.getEnergy = typeof options.getEnergy === 'function'
      ? options.getEnergy
      : () => 0;

    // управляющие параметры (можно менять через setControl)
    this.controls = Object.assign(
      {
        textSpeed: 1.0,   // базовая скорость прохода по строке
        textGlitch: 0.3   // базовая интенсивность глитча [0..1]
      },
      options.controls || {}
    );

    // глифы для крипто-эффекта (включая "электромагнитную" символику)
    this.glitchGlyphs = '01ΔΣΞΩ≈∿λµΩƒ≋▌▐▒░▓█#/%\\|+<>⧉⧖⧈◊⌁⌂↯';

    // внутренняя стейт-машина
    this.index = 0;        // текущая строка
    this.elapsed = 0;      // прошедшее время по текущей строке (сек)
    this.running = false;  
    this._lastTs = null;   // timestamp предыдущего кадра

    // бинды, чтобы удобно снимать/ставить RAF
    this._loop = this._loop.bind(this);
  }

  /* ------------------------- Публичный API -------------------------------- */

  /**
   * Запуск анимации.
   */
  start() {
    if (this.running) return;
    this.running = true;
    this._lastTs = null;
    requestAnimationFrame(this._loop);
  }

  /**
   * Остановка анимации (замораживает текущий кадр).
   */
  stop() {
    this.running = false;
  }

  /**
   * Жёсткий сброс таймлайна / переход на первую строку.
   */
  reset() {
    this.index = 0;
    this.elapsed = 0;
  }

  /**
   * Задать/поменять список строк на лету.
   * @param {string[]} lines
   */
  setLines(lines) {
    if (Array.isArray(lines) && lines.length) {
      this.lines = lines.slice();
      this.reset();
    }
  }

  /**
   * Установить значение одного управляющего параметра.
   * Например: engine.setControl('textGlitch', 0.8)
   * @param {string} name
   * @param {number} value
   */
  setControl(name, value) {
    if (typeof value !== 'number') return;
    this.controls[name] = value;
  }

  /**
   * Получить текущий текст (уже с глитчем), полезно для отладки.
   */
  getCurrentRenderedText() {
    const line = this.lines[this.index] || '';
    const phase = this.elapsed / this.duration;
    const revealPhase = this._computeRevealPhase(phase);
    const visibleLen = Math.floor(line.length * revealPhase);
    const baseVisible = line.slice(0, visibleLen);
    const energy = this._safeEnergy();
    return this._applyGlitch(baseVisible, phase, energy);
  }

  /* ---------------------- Внутренняя логика -------------------------------- */

  _loop(ts) {
    if (!this.running) return;

    if (this._lastTs == null) this._lastTs = ts;
    const dt = Math.max(0.001, (ts - this._lastTs) / 1000); // в секундах
    this._lastTs = ts;

    this._update(dt);
    this._render();

    requestAnimationFrame(this._loop);
  }

  /**
   * Обновление таймлайна CryptoText.
   */
  _update(dt) {
    const energy = this._safeEnergy();

    // Динамическая скорость: базовая * (0.6 + 0.8 * энергия)
    const baseSpeed = this.controls.textSpeed || 1.0;
    const effectiveSpeed = baseSpeed * (0.6 + 0.8 * energy);

    this.elapsed += dt * effectiveSpeed;

    while (this.elapsed > this.duration) {
      this.elapsed -= this.duration;
      this.index = (this.index + 1) % this.lines.length;
    }
  }

  /**
   * Отрисовка текущего состояния внутрь DOM-элемента.
   */
  _render() {
    const line = this.lines[this.index] || '';
    if (!line) {
      this.el.textContent = '';
      return;
    }

    const phase = this.elapsed / this.duration;        // 0..1
    const revealPhase = this._computeRevealPhase(phase);

    const visibleLen = Math.max(0, Math.floor(line.length * revealPhase));
    const baseVisible = line.slice(0, visibleLen);

    const energy = this._safeEnergy();
    const glitched = this._applyGlitch(baseVisible, phase, energy);

    this.el.textContent = glitched;
  }

  /**
   * Кривая "появление/исчезновение строки" (симметричный fade in/out).
   * @param {number} phase 0..1
   * @returns {number} 0..1
   */
  _computeRevealPhase(phase) {
    // первая половина — появление, вторая — растворение
    let p;
    if (phase < 0.5) {
      p = this._smooth01(phase / 0.5);
    } else {
      p = this._smooth01((1 - phase) / 0.5);
    }
    return p;
  }

  /**
   * Применение crypto-глитча к уже "раскрытому" тексту.
   * @param {string} visibleText
   * @param {number} phase       0..1 фаза строки
   * @param {number} energy      0..1 энергия аудио/EQ
   */
  _applyGlitch(visibleText, phase, energy) {
    const base = this.controls.textGlitch || 0;

    // На середине строки глитч максимально агрессивный
    const centerWeight = 1 - Math.abs(phase - 0.5) * 2; // 0 на краях, 1 в центре

    // Интенсивность глитча: базовая + вклад аудио-энергии
    let glitchIntensity =
      base * 0.7 +
      energy * 0.6 * (0.3 + 0.7 * centerWeight);
    glitchIntensity = this._clamp01(glitchIntensity);

    const glyphs = this.glitchGlyphs;
    const len = glyphs.length;

    let out = '';
    const t = this.elapsed; // локальное "время" для фазовых сдвигов

    for (let i = 0; i < visibleText.length; i++) {
      const ch = visibleText[i];

      // разделители и пробелы не портим
      if (' \u00a0/\\|:-—·,'.includes(ch)) {
        out += ch;
        continue;
      }

      // локальный "дыхательный" множитель
      const local = (Math.sin(t * 1.7 + i * 13.37) + 1) * 0.5; // 0..1
      const prob = glitchIntensity * local;                    // 0..1

      if (Math.random() < prob) {
        const idx = Math.floor(Math.random() * len);
        out += glyphs[idx];
      } else {
        out += ch;
      }
    }

    return out;
  }

  /* -------------------- Вспомогательные функции --------------------------- */

  _safeEnergy() {
    try {
      const v = this.getEnergy();
      if (typeof v !== 'number' || Number.isNaN(v)) return 0;
      return this._clamp01(v);
    } catch (e) {
      return 0;
    }
  }

  _clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  _smooth01(x) {
    x = this._clamp01(x);
    return x * x * (3 - 2 * x);
  }
}
