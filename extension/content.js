// MoniMusic (extensión) — se ejecuta dentro de YouTube Music.
// Archivo generado por tools/build-extension.js a partir de preload.js: edita preload.js, no este.
//  1) Fondo ambiental con la portada de la canción.
//  2) Panel de diseño (botón del monito, o Ctrl + ,).
//  3) Letra sincronizada (botón de letra, o Ctrl + L).

// ---------- utilidades de DOM (sin innerHTML: estas páginas exigen Trusted Types) ----------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style') node.style.cssText = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  children.forEach((child) => child && node.appendChild(child));
  return node;
}

function icon(paths) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  paths.forEach((d) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  });
  return svg;
}

const whenReady = (fn) => {
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', fn);
  else fn();
};

music();

function music() {
  const STORE = 'monky-settings-v1';
  // Al arrancar el preload la página aún no existe; <html> se toma en start().
  let root = null;

  const DEFAULTS = {
    preset: 'aurora',
    accentAuto: true,
    accent: '#c4a1ff',
    bg: 'cover',
    motion: 'on',
    vivid: 70,
    ambBright: 74,
    ambBlur: 90,
    glass: 52,
    blur: 28,
    fx: 'fast',
    radius: 14,
    font: 'default',
    zoom: 100,
  };

  // base = color de fondo del degradado; g = las tres manchas de color; ink = fondo sólido y de arranque.
  const PRESETS = {
    aurora: {
      name: 'Aurora',
      ink: '#0a0818',
      base: '#2b1570',
      glass: '14 12 28',
      g: ['rgba(140, 82, 255, 0.8)', 'rgba(255, 79, 150, 0.62)', 'rgba(40, 140, 255, 0.66)'],
      set: { bg: 'cover', accentAuto: true, accent: '#c4a1ff' },
    },
    selva: {
      name: 'Selva',
      ink: '#04140c',
      base: '#0b4d2e',
      glass: '6 22 14',
      g: ['rgba(34, 197, 94, 0.78)', 'rgba(190, 242, 100, 0.5)', 'rgba(13, 148, 136, 0.76)'],
      set: { bg: 'gradient', accentAuto: false, accent: '#9be37a' },
    },
    atardecer: {
      name: 'Atardecer',
      ink: '#190a08',
      base: '#7c1f2c',
      glass: '28 12 10',
      g: ['rgba(255, 122, 46, 0.82)', 'rgba(255, 60, 120, 0.7)', 'rgba(140, 60, 220, 0.66)'],
      set: { bg: 'gradient', accentAuto: false, accent: '#ffb36b' },
    },
    neon: {
      name: 'Neón',
      ink: '#060822',
      base: '#1a2096',
      glass: '8 10 34',
      g: ['rgba(0, 229, 255, 0.7)', 'rgba(255, 0, 200, 0.66)', 'rgba(70, 90, 255, 0.8)'],
      set: { bg: 'gradient', accentAuto: false, accent: '#5ef2ff' },
    },
    medianoche: {
      name: 'Medianoche',
      ink: '#000000',
      base: '#000000',
      glass: '0 0 0',
      g: ['transparent', 'transparent', 'transparent'],
      set: { bg: 'solid', accentAuto: true, accent: '#ffffff' },
    },
    clasico: { name: 'Clásico', off: true },
  };

  const ACCENTS = ['#c4a1ff', '#ff7ab6', '#ff6b6b', '#ffb36b', '#ffe066', '#9be37a', '#5ef2ff', '#6ba8ff', '#ffffff'];

  const FONTS = [
    ['default', 'Predeterminada'],
    ["'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif", 'Segoe UI'],
    ["Bahnschrift, 'Segoe UI', sans-serif", 'Bahnschrift'],
    ["'Trebuchet MS', 'Segoe UI', sans-serif", 'Trebuchet'],
    ["Georgia, 'Times New Roman', serif", 'Georgia (serif)'],
    ["'Cascadia Code', Consolas, monospace", 'Cascadia (mono)'],
  ];

  // ---------- ajustes ----------
  function load() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') };
    } catch {
      return { ...DEFAULTS };
    }
  }

  let settings = load();
  if (!PRESETS[settings.preset]) settings.preset = 'aurora';
  let autoAccent = DEFAULTS.accent;

  const enabled = () => !PRESETS[settings.preset].off;

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(settings));
    } catch {
      /* sin almacenamiento: los cambios duran hasta cerrar */
    }
  }

  function applyAccent() {
    root.style.setProperty('--mk-accent', settings.accentAuto ? autoAccent : settings.accent);
  }

  function apply() {
    const on = enabled();
    const preset = PRESETS[settings.preset];
    root.toggleAttribute('data-mk-off', !on);

    if (on) {
      root.style.setProperty('--mk-ink', preset.ink);
      root.style.setProperty('--mk-base', preset.base);
      // 0 % = velo oscuro fuerte (colores apagados) · 100 % = casi sin velo (colores a tope)
      root.style.setProperty('--mk-veil', String(1.3 - settings.vivid / 100));
      root.style.setProperty('--mk-glass-rgb', preset.glass);
      preset.g.forEach((color, i) => root.style.setProperty(`--mk-g${i + 1}`, color));
      root.style.setProperty('--mk-glass-a', String(settings.glass / 100));
      root.style.setProperty('--mk-blur', `${settings.blur}px`);
      root.style.setProperty('--mk-radius', `${settings.radius}px`);
      root.style.setProperty('--mk-amb-bright', String(settings.ambBright / 100));
      root.style.setProperty('--mk-amb-blur', `${settings.ambBlur}px`);
      root.dataset.mkBg = settings.bg;
      root.dataset.mkMotion = settings.motion === 'off' ? 'off' : 'on';
      root.dataset.mkFx = settings.fx === 'glass' ? 'glass' : 'fast';
      applyTone();
      if (settings.font === 'default') {
        delete root.dataset.mkFont;
      } else {
        root.style.setProperty('--mk-font', settings.font);
        root.dataset.mkFont = '1';
      }
    }
    if (!on) paintTitleBar('default');
    applyAccent();
  }

  // La app de escritorio pinta la barra de título de la ventana (la de Windows) con el color de la canción.
  // Aquí solo se avisa el color ("rrggbb", o "default" para el de siempre); cada versión lo entrega a su manera.
  let barColor = '';

  function paintTitleBar(color) {
    if (color === barColor) return;
    barColor = color;
  }

  // Color de las barras y pantallas en modo rápido: sale de la portada (fondo "Portada") o del tema.
  let coverTone = null;

  function applyTone() {
    let rgb = null;
    if (settings.bg === 'cover' && coverTone) {
      rgb = coverTone;
    } else {
      const hex = /^#([0-9a-f]{6})$/i.exec(PRESETS[settings.preset].base || '');
      rgb = hex ? [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) : [22, 14, 52];
    }
    const peak = Math.max(rgb[0], rgb[1], rgb[2], 1);
    const scaled = (target) => rgb.map((value) => Math.round((value / peak) * Math.min(target, Math.max(peak, 24)))).join(' ');
    root.style.setProperty('--mk-tone', scaled(62));
    root.style.setProperty('--mk-tone-hi', scaled(128));
    // la barra de título toma el color de la canción, un punto entre el tono oscuro y el claro
    // para que empate con la parte de arriba de la página
    if (enabled()) {
      paintTitleBar(
        scaled(92)
          .split(' ')
          .map((value) => Number(value).toString(16).padStart(2, '0'))
          .join(''),
      );
    }
  }

  const controls = [];
  const sync = () => controls.forEach((refresh) => refresh());

  function update(patch) {
    settings = { ...settings, ...patch };
    save();
    apply();
    sync();
  }

  // Con el tema "Clásico" se marca <html> desde el arranque para que no parpadee el tema.
  if (!enabled() && document.documentElement) document.documentElement.setAttribute('data-mk-off', '');

  // ---------- logo (quieto en pausa; mientras suena la música lo mueve una animación CSS) ----------
  const logos = [];
  let logoFiles = { still: '' };
  let logoAnimated = false;

  const paintLogos = () => {
    if (logoFiles.still) logos.forEach((img) => img.setAttribute('src', logoFiles.still));
  };

  function logo() {
    const img = el('img', { class: 'mk-logo', alt: '', draggable: 'false' });
    logos.push(img);
    paintLogos();
    return img;
  }

  function setLogoAnimated(on) {
    if (on === logoAnimated) return;
    logoAnimated = on;
    root.toggleAttribute('data-mk-playing', on);
  }

  logoFiles = { still: chrome.runtime.getURL('assets/logo.png') };

  // Lo que marca la barra del reproductor (segundos transcurridos y duración): es lo que ve la persona.
  function barTimes() {
    const bar = document.querySelector('#progress-bar');
    if (!bar) return null;
    const total = Number(bar.getAttribute('aria-valuemax'));
    const now = Number(bar.getAttribute('aria-valuenow'));
    if (!Number.isFinite(total) || total <= 0) return null;
    return { now: Number.isFinite(now) ? now : 0, total };
  }

  // El <video> que está sonando. YouTube Music a veces tiene más de uno (deja lista la siguiente canción en otro):
  // manda el que coincide con la barra del reproductor.
  function video() {
    const all = Array.from(document.querySelectorAll('video'));
    if (all.length <= 1) return all[0] || null;
    const bar = barTimes();
    if (bar) {
      const sameLength = all.filter((media) => Math.abs(media.duration - bar.total) < 2);
      const sameMoment = sameLength.filter((media) => Math.abs(media.currentTime - bar.now) < 4);
      if (sameMoment.length) return sameMoment[0];
      if (sameLength.length) return sameLength[0];
    }
    return all.find((media) => !media.paused && !media.ended) || all[0];
  }
  const adPlaying = () => Boolean(document.querySelector('.ad-showing'));

  // ---------- fondo ambiental ----------
  const layers = [];
  let active = 0;
  let currentArt = null;

  function buildAmbient() {
    if (document.getElementById('mk-ambient')) return;
    const ambient = el('div', { id: 'mk-ambient' });
    for (let i = 0; i < 2; i += 1) {
      const layer = el('div', { class: 'mk-layer' });
      ambient.appendChild(layer);
      layers.push(layer);
    }
    // manchas de color que se pasean por el fondo (ajuste "Movimiento")
    for (let i = 1; i <= 3; i += 1) ambient.appendChild(el('div', { class: `mk-blob mk-b${i}` }));
    ambient.appendChild(el('div', { class: 'mk-veil' }));
    document.body.prepend(ambient);
  }

  function bigger(url) {
    return url.replace(/=w\d+-h\d+/, '=w480-h480').replace(/\/(sd|mq|hq)?default\.jpg/, '/hqdefault.jpg');
  }

  function findArt() {
    const meta = navigator.mediaSession && navigator.mediaSession.metadata;
    if (meta && meta.artwork && meta.artwork.length) {
      return meta.artwork[meta.artwork.length - 1].src;
    }
    const img = document.querySelector(
      'ytmusic-player-bar .thumbnail-image-wrapper img, ytmusic-player-bar img.image, ytmusic-miniplayer img',
    );
    return img && img.src && !img.src.startsWith('data:') ? bigger(img.src) : '';
  }

  // Color de acento automático: promedio de los píxeles más vivos de la portada, aclarado.
  function pickAccent(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const sat = max === 0 ? 0 : (max - min) / max;
          const weight = sat * sat * (max / 255) + 0.001;
          r += data[i] * weight;
          g += data[i + 1] * weight;
          b += data[i + 2] * weight;
          total += weight;
        }
        coverTone = [r / total, g / total, b / total];
        applyTone();
        const lift = 235 / Math.max(r / total, g / total, b / total, 1);
        const mix = (value) => Math.round(Math.min(255, (value / total) * lift) * 0.82 + 255 * 0.18);
        autoAccent = `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
      } catch {
        autoAccent = DEFAULTS.accent;
      }
      applyAccent();
    };
    img.onerror = () => {
      autoAccent = DEFAULTS.accent;
      applyAccent();
    };
    img.src = url;
  }

  function updateAmbient() {
    const art = findArt();
    if (art === currentArt) return;
    currentArt = art;
    const next = layers[1 - active];
    const prev = layers[active];
    if (art) {
      next.style.backgroundImage = `url("${art}")`;
      next.classList.add('mk-on');
      pickAccent(art);
    } else {
      autoAccent = DEFAULTS.accent;
      applyAccent();
      coverTone = null;
      applyTone();
    }
    prev.classList.remove('mk-on');
    active = 1 - active;
  }

  // ---------- botones en la barra superior ----------
  let tools = null;

  // Van dentro del grupo de botones de YouTube Music, así nunca se enciman con "Acceder" ni con tu foto.
  function placeTools() {
    if (!tools) return;
    const host = document.querySelector('ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content');
    if (host) {
      if (tools.parentElement !== host) host.appendChild(tools);
      tools.classList.remove('mk-floating');
    } else if (!tools.isConnected) {
      document.body.appendChild(tools);
      tools.classList.add('mk-floating');
    }
  }

  // En la pestaña "Letra" de YouTube Music (que no sigue la canción) se añade un botón hacia la letra en vivo.
  let lyricsCta = null;

  function placeLyricsCta() {
    const shelf = document.querySelector('ytmusic-player-page ytmusic-tab-renderer ytmusic-description-shelf-renderer');
    if (!shelf || !shelf.parentElement) return;
    if (!lyricsCta) {
      lyricsCta = el(
        'button',
        { id: 'mk-ly-cta', type: 'button', onclick: () => toggleLyrics(true) },
        icon(['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z', 'M20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z']),
        el('span', { text: 'Ver la letra siguiendo la canción' }),
      );
    }
    if (lyricsCta.nextElementSibling !== shelf) shelf.parentElement.insertBefore(lyricsCta, shelf);
  }

  // ---------- panel de diseño ----------
  const panelOpen = () => root.hasAttribute('data-mk-open');
  const togglePanel = (open) => root.toggleAttribute('data-mk-open', open);

  function presetPreview(preset) {
    if (preset.off) return 'linear-gradient(135deg, #2a2a2a, #030303)';
    return [
      `radial-gradient(70% 80% at 10% 0%, ${preset.g[0]}, transparent 70%)`,
      `radial-gradient(60% 70% at 95% 10%, ${preset.g[1]}, transparent 70%)`,
      `radial-gradient(70% 70% at 60% 110%, ${preset.g[2]}, transparent 70%)`,
      preset.base,
    ].join(', ');
  }

  function section(title, needsTheme, ...children) {
    return el('section', { class: `mk-section${needsTheme ? ' mk-needs-theme' : ''}` }, el('h3', { text: title }), ...children);
  }

  function slider(label, key, min, max, unit) {
    const output = el('output');
    const input = el('input', {
      type: 'range',
      min,
      max,
      step: 1,
      'aria-label': label,
      oninput: () => update({ [key]: Number(input.value) }),
    });
    controls.push(() => {
      input.value = settings[key];
      output.textContent = `${settings[key]}${unit}`;
    });
    return el('div', { class: 'mk-row' }, el('label', { text: label }), output, input);
  }

  function segmented(key, options) {
    const group = el('div', { class: 'mk-seg', role: 'group' });
    options.forEach(([value, label]) => {
      const button = el('button', { type: 'button', text: label, onclick: () => update({ [key]: value }) });
      controls.push(() => button.setAttribute('aria-pressed', String(settings[key] === value)));
      group.appendChild(button);
    });
    return group;
  }

  function buildPanel() {
    if (document.getElementById('mk-panel')) return;

    const fab = el(
      'button',
      {
        id: 'mk-fab',
        type: 'button',
        title: 'Diseño de MoniMusic (Ctrl + ,)',
        'aria-label': 'Abrir el panel de diseño',
        onclick: () => togglePanel(!panelOpen()),
      },
      logo(),
    );
    const lyricsButton = el(
      'button',
      {
        id: 'mk-lyrics-btn',
        type: 'button',
        title: 'Letra sincronizada (Alt + L)',
        'aria-label': 'Mostrar la letra sincronizada',
        onclick: () => toggleLyrics(!lyricsOpen()),
      },
      icon(['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z', 'M20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z']),
      el('span', { text: 'Letra en vivo' }),
    );
    tools = el('div', { id: 'mk-tools' }, lyricsButton, fab);

    const scrim = el('div', { id: 'mk-scrim', onclick: () => togglePanel(false) });

    // Temas
    const presets = el('div', { class: 'mk-presets' });
    Object.entries(PRESETS).forEach(([id, preset]) => {
      const card = el(
        'button',
        {
          class: 'mk-preset',
          type: 'button',
          onclick: () => update({ preset: id, ...(preset.set || {}) }),
        },
        el('i', { style: `background: ${presetPreview(preset)}` }),
        el('span', { text: preset.name }),
      );
      controls.push(() => card.setAttribute('aria-pressed', String(settings.preset === id)));
      presets.appendChild(card);
    });

    // Acento
    const swatches = el('div', { class: 'mk-swatches' });
    const auto = el('button', {
      class: 'mk-swatch mk-auto',
      type: 'button',
      text: 'Auto',
      title: 'Tomar el color de la portada que suena',
      onclick: () => update({ accentAuto: true }),
    });
    controls.push(() => auto.setAttribute('aria-pressed', String(settings.accentAuto)));
    swatches.appendChild(auto);
    ACCENTS.forEach((color) => {
      const swatch = el('button', {
        class: 'mk-swatch',
        type: 'button',
        style: `background: ${color}`,
        'aria-label': `Color ${color}`,
        onclick: () => update({ accentAuto: false, accent: color }),
      });
      controls.push(() => swatch.setAttribute('aria-pressed', String(!settings.accentAuto && settings.accent === color)));
      swatches.appendChild(swatch);
    });
    const custom = el('input', {
      type: 'color',
      title: 'Elegir otro color',
      'aria-label': 'Elegir otro color',
      oninput: () => update({ accentAuto: false, accent: custom.value }),
    });
    controls.push(() => {
      if (/^#[0-9a-f]{6}$/i.test(settings.accent)) custom.value = settings.accent;
    });
    swatches.appendChild(custom);

    // Tipografía
    const font = el('select', { 'aria-label': 'Tipografía', onchange: () => update({ font: font.value }) });
    FONTS.forEach(([value, label]) => font.appendChild(el('option', { value, text: label })));
    controls.push(() => {
      font.value = settings.font;
    });

    const panel = el(
      'aside',
      { id: 'mk-panel', 'aria-label': 'Diseño de MoniMusic' },
      el(
        'header',
        { class: 'mk-head' },
        logo(),
        el('div', {}, el('div', { class: 'mk-title', text: 'MoniMusic' }), el('div', { class: 'mk-sub', text: 'Diseña tu reproductor' })),
        el('button', { class: 'mk-close', type: 'button', text: '✕', 'aria-label': 'Cerrar', onclick: () => togglePanel(false) }),
      ),
      el(
        'div',
        { class: 'mk-body' },
        section('Tema', false, presets),
        section('Color de acento', false, swatches),
        section(
          'Fondo',
          true,
          segmented('bg', [
            ['cover', 'Portada'],
            ['gradient', 'Degradado'],
            ['solid', 'Sólido'],
          ]),
          slider('Intensidad del color', 'vivid', 0, 100, '%'),
          slider('Brillo de la portada', 'ambBright', 30, 120, '%'),
          slider('Desenfoque de la portada', 'ambBlur', 20, 160, ' px'),
          el('p', { class: 'mk-hint', text: 'Movimiento de los colores del fondo' }),
          segmented('motion', [
            ['on', 'En movimiento'],
            ['off', 'Quieto'],
          ]),
        ),
        section(
          'Efectos',
          true,
          segmented('fx', [
            ['fast', 'Rápido'],
            ['glass', 'Cristal'],
          ]),
          el('p', {
            class: 'mk-hint',
            text: 'Rápido: colores sólidos de la portada, la app responde al instante. Cristal: paneles translúcidos con desenfoque; se ve más fino pero pesa más.',
          }),
          el(
            'div',
            { class: 'mk-only-glass' },
            slider('Opacidad de los paneles', 'glass', 10, 82, '%'),
            slider('Desenfoque del cristal', 'blur', 0, 60, ' px'),
          ),
        ),
        section('Formas', true, slider('Redondez de las esquinas', 'radius', 0, 28, ' px')),
        section('Tipografía', true, font),
      ),
      el(
        'footer',
        { class: 'mk-foot' },
        el('span', { text: 'Ctrl + ,  diseño   ·   Alt + L  letra' }),
        el('button', {
          class: 'mk-reset',
          type: 'button',
          text: 'Restablecer',
          onclick: () => update({ ...DEFAULTS }),
        }),
      ),
    );

    document.body.append(scrim, panel);
    placeTools();
    sync();
  }

  // ---------- letra sincronizada ----------
  const ly = { key: '', lines: [], status: 'idle', active: -1, nodes: [], hold: 0 };
  let lyricsBox = null;
  let lyScroll = null;
  let lyCover = null;
  let lyBg = null;
  let lyTitle = null;
  let lyArtist = null;
  let lyNote = null;

  const lyricsOpen = () => root.hasAttribute('data-mk-lyrics');

  function toggleLyrics(open) {
    root.toggleAttribute('data-mk-lyrics', open);
    if (open) {
      ly.key = '';
      updateLyrics();
    }
  }

  function trackInfo() {
    const meta = navigator.mediaSession && navigator.mediaSession.metadata;
    const bar = document.querySelector('ytmusic-player-bar');
    let title = meta && meta.title;
    let artist = meta && meta.artist;
    const album = (meta && meta.album) || '';
    if (!title && bar) {
      const titleNode = bar.querySelector('.content-info-wrapper .title, .title');
      const byline = bar.querySelector('.byline');
      title = titleNode ? titleNode.textContent.trim() : '';
      artist = byline ? byline.textContent.split('•')[0].trim() : '';
    }
    if (!title) return null;
    // La duración sale de la barra del reproductor; el <video> queda de respaldo.
    const times = barTimes();
    const media = video();
    const duration = times ? times.total : media && Number.isFinite(media.duration) ? media.duration : 0;
    return { title, artist: artist || '', album, duration };
  }

  function parseLrc(text) {
    const lines = [];
    text.split(/\r?\n/).forEach((raw) => {
      const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if (!stamps.length) return;
      const words = raw.replace(/\[[^\]]*\]/g, '').trim();
      stamps.forEach((stamp) => lines.push({ t: Number(stamp[1]) * 60 + Number(stamp[2]), text: words }));
    });
    return lines.sort((a, b) => a.t - b.t);
  }

  function setState(state) {
    ly.status = state;
    if (lyricsBox) lyricsBox.setAttribute('data-state', state);
  }

  function setArt(url) {
    [lyCover, lyBg].forEach((img) => {
      if (!img) return;
      if (url) {
        if (img.getAttribute('src') !== url) img.src = url;
      } else {
        img.removeAttribute('src');
      }
    });
  }

  // Aviso en el lugar de la letra, con unas barras de sonido que se mueven mientras suena la canción.
  function showMessage(text, hint) {
    ly.nodes = [];
    ly.active = -1;
    const wave = el('div', { class: 'mk-ly-wave', 'aria-hidden': 'true' });
    for (let i = 0; i < 18; i += 1) {
      const speed = (0.62 + ((i * 7) % 5) * 0.13).toFixed(2);
      const shift = ((i * 0.37) % 1.1).toFixed(2);
      wave.appendChild(el('i', { style: `animation-duration:${speed}s;animation-delay:-${shift}s` }));
    }
    lyScroll.replaceChildren(
      el(
        'div',
        { class: 'mk-ly-empty' },
        wave,
        el('p', { class: 'mk-ly-msg', text }),
        hint ? el('p', { class: 'mk-ly-hint', text: hint }) : null,
      ),
    );
    lyScroll.scrollTop = 0;
  }

  function renderLines(synced) {
    ly.active = -1;
    ly.nodes = ly.lines.map((line) => {
      const node = el('p', { class: `mk-line${synced ? '' : ' mk-plain'}`, text: line.text || (synced ? '♪' : ' ') });
      if (synced) {
        node.addEventListener('click', () => {
          const media = video();
          if (media) media.currentTime = line.t;
        });
      }
      return node;
    });
    lyScroll.replaceChildren(...ly.nodes);
    lyScroll.scrollTop = 0;
  }

  async function updateLyrics() {
    if (!lyricsBox || !lyricsOpen()) return;
    const info = trackInfo();
    if (!info) {
      if (ly.status !== 'empty') {
        setState('empty');
        ly.key = '';
        lyTitle.textContent = 'MoniMusic';
        lyArtist.textContent = '';
        lyNote.textContent = '';
        setArt(null);
        showMessage('Pon una canción', 'Aquí verás su letra siguiendo la música.');
      }
      return;
    }
    if (adPlaying() || !info.duration) {
      // Se espera a que empiece la canción de verdad; si aún no hay nada en pantalla, se avisa.
      if (ly.status === 'idle' || ly.status === 'empty') {
        setState('waiting');
        ly.key = '';
        if (adPlaying()) showMessage('Un momento…', 'La letra aparece en cuanto termine el anuncio.');
        else showMessage('Cargando la canción…');
      }
      return;
    }

    // La duración va en la clave: justo al cambiar de canción el reproductor todavía informa la duración
    // de la anterior, y con ese dato no se encuentra la letra con tiempos. Cuando llega la duración real,
    // la clave cambia y se vuelve a buscar.
    const key = `${info.title}|${info.artist}|${Math.round(info.duration)}`;
    if (key === ly.key) return;
    ly.key = key;
    setState('loading');
    ly.lines = [];
    lyTitle.textContent = info.title;
    lyArtist.textContent = info.artist;
    setArt(currentArt);
    lyNote.textContent = '';
    showMessage('Buscando la letra…');

    let result = null;
    try {
      result = await chrome.runtime.sendMessage({ type: 'lyrics', info });
    } catch {
      result = null;
    }
    if (key !== ly.key) return; // ya cambió la canción

    if (result && result.synced) {
      ly.lines = parseLrc(result.synced);
    }
    if (ly.lines.length) {
      setState('synced');
      lyNote.textContent = 'Letra en vivo';
      renderLines(true);
    } else if (result && result.plain) {
      setState('plain');
      ly.lines = result.plain.split(/\r?\n/).map((text) => ({ t: 0, text }));
      lyNote.textContent = result.from ? `Letra de la versión de ${result.from}` : 'Letra sin tiempos';
      renderLines(false);
    } else {
      setState('none');
      showMessage('Esta canción no tiene letra', 'No está en el catálogo de letras. Sigue sonando igual.');
    }
  }

  function tickLyrics() {
    if (!lyricsBox || !lyricsOpen()) return;

    // El recuadro ocupa el espacio entre la barra superior y el reproductor.
    const nav = document.querySelector('ytmusic-nav-bar');
    const top = nav ? nav.getBoundingClientRect().bottom : 64;
    let bottom = 0;
    document.querySelectorAll('ytmusic-player-bar, ytmusic-miniplayer, #player-bar-background').forEach((bar) => {
      const rect = bar.getBoundingClientRect();
      if (rect.height > 0 && rect.top < window.innerHeight) {
        bottom = Math.max(bottom, window.innerHeight - rect.top);
      }
    });
    // Con la barra en forma de isla flotante, la letra llega hasta abajo y pasa por detrás de ella.
    let pad = 0;
    const island = document.querySelector('ytmusic-player-bar');
    const islandBox = island ? island.getBoundingClientRect() : null;
    if (islandBox && islandBox.height > 0 && islandBox.left > 2 && window.innerHeight - islandBox.bottom > 2) {
      pad = Math.round(window.innerHeight - islandBox.top + 8);
      bottom = 0;
    }
    lyricsBox.style.setProperty('--mk-ly-pad', `${pad}px`);
    // Si el menú lateral está fijo a la izquierda, la letra empieza donde termina.
    let left = 0;
    document.querySelectorAll('#guide-wrapper, #mini-guide-background').forEach((guide) => {
      const rect = guide.getBoundingClientRect();
      if (rect.width > 0 && rect.left <= 0 && rect.right > 0 && rect.right < window.innerWidth * 0.5) {
        left = Math.max(left, rect.right);
      }
    });
    lyricsBox.style.left = `${Math.round(left)}px`;
    lyricsBox.style.top = `${Math.round(top)}px`;
    lyricsBox.style.bottom = `${Math.round(bottom)}px`;

    // La portada a veces llega un instante después que el título.
    if (currentArt && ly.status !== 'empty') setArt(currentArt);

    const media = video();
    if (ly.status === 'plain') {
      // Sin tiempos no se puede marcar línea por línea: el texto baja al ritmo de la canción.
      // Si la persona mueve la letra a mano, se le deja en paz unos segundos.
      if (media && media.duration > 0 && !adPlaying() && Date.now() > ly.hold) {
        const room = lyScroll.scrollHeight - lyScroll.clientHeight;
        const target = Math.round(room * Math.min(1, media.currentTime / media.duration));
        if (Math.abs(target - lyScroll.scrollTop) > 6) lyScroll.scrollTo({ top: target, behavior: 'smooth' });
      }
      return;
    }
    if (ly.status !== 'synced') return;
    if (!media || adPlaying()) return;
    const now = media.currentTime + 0.25;
    let index = -1;
    for (let i = 0; i < ly.lines.length; i += 1) {
      if (ly.lines[i].t <= now) index = i;
      else break;
    }
    if (index === ly.active) return;
    ly.active = index;
    ly.nodes.forEach((node, i) => {
      node.classList.toggle('mk-active', i === index);
      node.classList.toggle('mk-past', i < index);
    });
    const current = ly.nodes[index];
    if (current) {
      // La línea se va "llenando" de luz durante lo que dura (hasta que empieza la siguiente).
      const next = ly.lines[index + 1];
      const span = next ? next.t - ly.lines[index].t : 5;
      current.style.setProperty('--mk-dur', `${Math.min(12, Math.max(0.5, span)).toFixed(2)}s`);
      lyScroll.scrollTo({
        top: current.offsetTop - lyScroll.clientHeight / 2 + current.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }

  function buildLyrics() {
    if (document.getElementById('mk-lyrics')) return;
    lyBg = el('img', { alt: '' });
    lyCover = el('img', { class: 'mk-ly-cover', alt: '' });
    lyTitle = el('div', { class: 'mk-ly-title' });
    lyArtist = el('div', { class: 'mk-ly-artist' });
    lyNote = el('div', { class: 'mk-ly-note' });
    lyScroll = el('div', { class: 'mk-ly-scroll' });
    ['wheel', 'touchmove', 'pointerdown'].forEach((type) => {
      lyScroll.addEventListener(type, () => { ly.hold = Date.now() + 7000; }, { passive: true });
    });
    const close = el('button', {
      class: 'mk-ly-close',
      type: 'button',
      'aria-label': 'Cerrar la letra',
      onclick: () => toggleLyrics(false),
    });
    close.appendChild(icon(['M6 6l12 12', 'M18 6L6 18']));
    lyricsBox = el(
      'section',
      { id: 'mk-lyrics', 'aria-label': 'Letra sincronizada', 'data-state': 'idle' },
      // fondo: la misma portada, muy desenfocada
      el('div', { class: 'mk-ly-bg', 'aria-hidden': 'true' }, lyBg),
      el(
        'div',
        { class: 'mk-ly-side' },
        // portada con un disco que asoma y gira mientras suena
        el('div', { class: 'mk-ly-art' }, el('div', { class: 'mk-ly-disc', 'aria-hidden': 'true' }), lyCover),
        lyTitle,
        lyArtist,
        el(
          'div',
          { class: 'mk-ly-meta' },
          el('span', { class: 'mk-ly-eq', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('i')),
          lyNote,
        ),
      ),
      lyScroll,
      close,
    );
    document.body.appendChild(lyricsBox);
  }

  // ---------- arranque ----------
  function start() {
    if (!document.body) return;
    root = document.documentElement;
    const step = (name, fn) => {
      try {
        const result = fn();
        if (result && typeof result.catch === 'function') {
          result.catch((error) => console.error(`[monimusic] ${name}: ${error && error.stack ? error.stack : error}`));
        }
      } catch (error) {
        console.error(`[monimusic] ${name}: ${error && error.stack ? error.stack : error}`);
      }
    };

    step('fondo', buildAmbient);
    step('panel', buildPanel);
    step('letra', buildLyrics);
    step('ajustes', apply);
    step('portada', updateAmbient);

    setInterval(() => {
      if (document.hidden) return; // minimizada u oculta: no se gasta en lo visual
      step('portada', updateAmbient);
      step('botones', placeTools);
      step('acceso a la letra', placeLyricsCta);
      step('letra', updateLyrics);
      step('logo', () => {
        const media = video();
        setLogoAnimated(Boolean(media && !media.paused && !media.ended));
      });
    }, 1200);
    // Al cambiar de sección (buscar, Explorar, Biblioteca...) la letra en vivo se cierra sola.
    // Pasar de una canción a otra no cuenta: la dirección sigue siendo /watch.
    let lastPath = location.pathname;
    const onNavigate = () => {
      const path = location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      if (path !== '/watch' && lyricsOpen()) toggleLyrics(false);
    };
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('yt-navigate-finish', onNavigate);

    setInterval(() => {
      step('navegación', onNavigate);
      if (!document.hidden) step('letra', tickLyrics);
    }, 200);

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === ',') {
        event.preventDefault();
        togglePanel(!panelOpen());
      } else if (event.altKey && !event.ctrlKey && !event.shiftKey && key === 'l') {
        event.preventDefault();
        toggleLyrics(!lyricsOpen());
      } else if (key === 'escape') {
        if (panelOpen()) togglePanel(false);
        else if (lyricsOpen()) toggleLyrics(false);
      }
    });
  }

  whenReady(start);
}
