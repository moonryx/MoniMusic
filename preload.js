// MoniMusic — se ejecuta dentro de la página (YouTube Music o el inicio de sesión de Google).
//  1) Fondo ambiental con la portada de la canción.
//  2) Panel de diseño (botón del monito, o Ctrl + ,).
//  3) Letra sincronizada (botón de letra, o Ctrl + L).
const { ipcRenderer, webFrame } = require('electron');

const HOME = 'https://music.youtube.com/';

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

// ---------- fuera de YouTube Music (inicio de sesión): botón para volver ----------
if (location.hostname !== 'music.youtube.com') {
  whenReady(() => {
    if (!document.body || !/^https?:$/.test(location.protocol)) return;
    const back = el('button', {
      type: 'button',
      text: '←  Volver a MoniMusic',
      onclick: () => {
        location.href = HOME;
      },
    });
    back.style.cssText = [
      'position:fixed',
      'top:10px',
      'left:12px',
      'z-index:2147483647',
      'padding:8px 14px',
      'border-radius:999px',
      'border:1px solid rgba(255,255,255,.18)',
      'background:rgba(24,22,34,.92)',
      'color:#f1eef8',
      "font:600 13px 'Segoe UI',system-ui,sans-serif",
      'cursor:pointer',
      '-webkit-app-region:no-drag',
    ].join(';');
    document.body.appendChild(back);
  });
} else {
  music();
}

function music() {
  const STORE = 'monky-settings-v1';
  // Al arrancar el preload la página aún no existe; <html> se toma en start().
  let root = null;

  const DEFAULTS = {
    preset: 'aurora',
    accentAuto: true,
    accent: '#c4a1ff',
    bg: 'cover',
    motion: 'music',
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
    ipcRenderer.send('mk:theme', on);

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
      // "on" era el valor de la versión anterior: ahora es "con la música"
      root.dataset.mkMotion = settings.motion === 'off' || settings.motion === 'calm' ? settings.motion : 'music';
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
    webFrame.setZoomFactor(settings.zoom / 100);
  }

  // La app de escritorio pinta la barra de título de la ventana (la de Windows) con el color de la canción.
  // Aquí solo se avisa el color ("rrggbb", o "default" para el de siempre); cada versión lo entrega a su manera.
  let barColor = '';

  function paintTitleBar(color) {
    if (color === barColor) return;
    barColor = color;
    ipcRenderer.send('mk:titlebar', color);
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

  // El tema se decide antes de que cargue la página para que no parpadee.
  ipcRenderer.send('mk:theme', enabled());

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

  ipcRenderer
    .invoke('mk:logos')
    .then((files) => {
      logoFiles = files || logoFiles;
      paintLogos();
    })
    .catch(() => {});

  // Lo que marca la barra del reproductor (segundos transcurridos y duración): es lo que ve la persona.
  let progressBar = null;
  function playerProgress() {
    if (!progressBar?.isConnected) progressBar = document.querySelector('ytmusic-player-bar #progress-bar, #progress-bar');
    return progressBar;
  }
  function barTimes() {
    const bar = playerProgress();
    if (!bar) return null;
    const total = Number(bar.getAttribute('aria-valuemax'));
    const now = Number(bar.getAttribute('aria-valuenow'));
    if (!Number.isFinite(total) || total <= 0) return null;
    return { now: Number.isFinite(now) ? now : 0, total };
  }

  // El <video> que está sonando. YouTube Music a veces tiene más de uno (deja lista la siguiente canción en otro,
  // o el de la vuelta anterior de la misma canción, ya terminado): manda el que suena.
  let playingMedia = null;
  function video() {
    if (playingMedia?.isConnected && !playingMedia.paused && !playingMedia.ended) return playingMedia;
    const all = Array.from(document.querySelectorAll('video'));
    if (all.length <= 1) return (playingMedia = all[0] || null);
    const score = (media) => (!media.paused && !media.ended ? 0 : media.ended ? 2 : 1);
    playingMedia = all.reduce((best, media) => (score(media) < score(best) ? media : best));
    return playingMedia;
  }

  // Dónde va la canción, en segundos con decimales.
  // La barra del reproductor dice la verdad, pero solo en segundos enteros. El <video> da los decimales, aunque su
  // reloj no siempre empieza en cero: con canciones encadenadas sin corte (pasa con cuentas Premium) sigue sumando
  // lo de las canciones anteriores. Por eso se mide el desfase entre los dos (clock.offset) y se le resta al video.
  const clock = { song: '', media: null, lo: 0, hi: 0, zero: true, known: false, doubt: 0, trust: 0, barNow: -1, barAt: 0 };
  function playhead() {
    const times = barTimes();
    const media = video();
    const tick = performance.now();
    if (!times) {
      if (!media || !Number.isFinite(media.currentTime)) return null;
      return { t: media.currentTime, total: media.duration, playing: !media.paused && !media.ended, media, offset: 0, sure: false };
    }
    if (times.now !== clock.barNow) {
      clock.barNow = times.now;
      clock.barAt = tick;
    }
    if (!media || !Number.isFinite(media.currentTime)) {
      // sin video a la vista: la barra, completando el segundo mientras avanza
      const since = (tick - clock.barAt) / 1000;
      const playing = since < 1.6;
      return { t: times.now + (playing ? Math.min(0.95, since) : 0), total: times.total, playing, media: null, offset: 0, sure: false };
    }

    // d = desfase + la fracción del segundo que la barra todavía no muestra (entre 0 y poco más de 1)
    const d = media.currentTime - times.now;
    const title = document.querySelector('ytmusic-player-bar .title');
    const song = `${title ? title.textContent : ''}|${times.total}`;
    const restart = () => {
      clock.song = song;
      clock.media = media;
      clock.zero = d > -0.4 && d < 1.7; // lo normal: el video empieza en cero
      clock.lo = d - 1.3;
      clock.hi = d;
      clock.known = true;
      clock.doubt = 0;
    };
    const fits = clock.zero ? d > -0.6 && d < 1.9 : d > clock.lo - 0.4 && d < clock.hi + 1.7;
    if (!clock.known || song !== clock.song || media !== clock.media) {
      restart();
    } else if (fits) {
      clock.doubt = 0;
      if (!clock.zero) {
        clock.lo = Math.max(clock.lo, d - 1.3);
        clock.hi = Math.min(clock.hi, d);
      }
    } else if (tick > clock.trust) {
      // Al saltar dentro de la canción el video cambia al instante y la barra tarda un momento: el desfase es el
      // mismo, así que se espera. Si pasado ese momento sigue sin cuadrar, se mide de nuevo.
      if (!clock.doubt) clock.doubt = tick;
      else if (tick - clock.doubt > 900) restart();
    }
    const offset = clock.zero ? 0 : clock.hi - clock.lo < 0.6 ? clock.hi - 0.1 : (clock.lo + clock.hi) / 2;
    const t = Math.max(0, media.currentTime - offset);
    return { t, total: times.total, playing: !media.paused && !media.ended, media, offset, sure: !clock.doubt };
  }

  // Lleva la canción a ese segundo (contando el desfase del video).
  function seekTo(seconds) {
    const head = playhead();
    if (!head || !head.media) return;
    clock.trust = performance.now() + 1500; // el salto es nuestro: el desfase no cambia
    clock.doubt = 0;
    head.media.currentTime = seconds + head.offset;
  }

  // ---------- barra de progreso fluida ----------
  // YouTube Music mueve la bolita una vez por segundo, a saltos. Aquí avanza cuadro por cuadro con el tiempo real
  // de la canción, y cuando la canción salta (otra parte, otra canción) se desliza hasta su sitio en vez de
  // aparecer de golpe. Al arrastrarla o si algo no cuadra, vuelve a mandar la de YouTube Music.
  const smooth = { raf: 0, shown: -1, then: 0 };
  function smoothFrame(now) {
    smooth.raf = 0;
    const bar = playerProgress();
    if (!bar || document.hidden) return;
    const head = playhead();
    const dragging = Boolean(bar.querySelector('.dragging')) || bar.matches(':active');
    let moving = false;
    if (head && head.media && head.total > 0 && !dragging && !adPlaying()) {
      const target = Math.min(1, Math.max(0, head.t / head.total));
      const dt = Math.min(100, smooth.then ? now - smooth.then : 16);
      const gap = target - smooth.shown;
      // de cerca va pegada al tiempo real; si quedó lejos, se acerca con suavidad
      if (smooth.shown < 0 || Math.abs(gap) < 0.004) smooth.shown = target;
      else smooth.shown += gap * (1 - Math.exp(-dt / 110));
      moving = Math.abs(target - smooth.shown) > 0.0002;
      bar.style.setProperty('--mk-progress', smooth.shown.toFixed(5));
      if (!bar.hasAttribute('data-mk-smooth')) bar.setAttribute('data-mk-smooth', '');
    } else {
      smooth.shown = -1;
      if (bar.hasAttribute('data-mk-smooth')) bar.removeAttribute('data-mk-smooth');
    }
    smooth.then = now;
    if ((head && head.playing) || moving) smooth.raf = requestAnimationFrame(smoothFrame);
    else smooth.then = 0;
  }
  function smoothBar() {
    if (!smooth.raf) smooth.raf = requestAnimationFrame(smoothFrame);
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
    ambient.appendChild(el('div', { class: 'mk-veil' }));
    // manchas de color que se pasean por el fondo (ajuste "Movimiento") y un destello que late con los golpes
    for (let i = 1; i <= 3; i += 1) {
      const blob = el('div', { class: `mk-blob mk-b${i}` });
      ambient.appendChild(blob);
      beat.blobs.push(blob);
    }
    ambient.appendChild(el('div', { class: 'mk-flash' }));
    beat.box = ambient;
    document.body.prepend(ambient);
  }

  // ---------- el fondo baila con la música ----------
  // Se escucha el sonido del reproductor con una copia (captureStream): no se desvía, sigue sonando igual.
  // De esa copia se miden los graves: en cada golpe las manchas laten y sale un destello, y mientras más golpes
  // y más volumen tiene la canción, más rápido se pasean. Solo trabaja con el ajuste "Con la música",
  // mientras suena algo y con la ventana a la vista.
  const beat = {
    box: null,
    blobs: [],
    ctx: null,
    analyser: null,
    data: null,
    source: null,
    media: null,
    stream: null,
    track: null, // la pista de audio enganchada al medidor
    stale: false, // apareció otra pista (otra canción): toca engancharse de nuevo
    hookedAt: 0,
    quiet: 0, // desde cuándo llega silencio total
    raf: 0,
    then: 0,
    avg: 0,
    pulse: 0,
    level: 0,
    last: 0,
    hits: [],
    rate: 1,
    rateAt: 0,
    phase: [0.4, 2.1, 4.0], // en qué punto de su paseo va cada mancha
    off: false, // sin forma de escuchar (navegador sin captureStream o AudioContext)
  };
  const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function wantsBeat() {
    return (
      enabled() &&
      settings.motion !== 'off' &&
      settings.motion !== 'calm' &&
      settings.bg !== 'solid' &&
      !calmMotion.matches &&
      !document.hidden
    );
  }

  function listenTo(media) {
    // Sigue enganchado a la pista que suena: nada que hacer.
    if (beat.media === media && beat.track && beat.track.readyState === 'live' && !beat.stale) return true;
    if (beat.off || typeof media.captureStream !== 'function') {
      beat.off = true;
      return false;
    }
    if (!beat.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) {
        beat.off = true;
        return false;
      }
      beat.ctx = new Context();
      beat.analyser = beat.ctx.createAnalyser();
      beat.analyser.fftSize = 1024;
      beat.analyser.smoothingTimeConstant = 0.35;
      beat.data = new Float32Array(beat.analyser.frequencyBinCount);
      // El medidor tiene que llegar a la salida para recibir datos; va con volumen cero, así no suena doble.
      const mute = beat.ctx.createGain();
      mute.gain.value = 0;
      beat.analyser.connect(mute);
      mute.connect(beat.ctx.destination);
    }
    try {
      const stream = media.captureStream();
      const tracks = stream.getAudioTracks();
      if (!tracks.length) return false; // todavía sin sonido: se reintenta en un momento
      // Al cambiar de canción YouTube Music suma una pista nueva y la anterior se queda viva pero muda.
      // El medidor solo oye una: se le da la más reciente, y se vuelve a enganchar cuando aparece otra.
      const track = tracks[tracks.length - 1];
      const source = beat.ctx.createMediaStreamSource(new MediaStream([track]));
      if (beat.source) {
        try {
          beat.source.disconnect();
        } catch {
          /* ya estaba suelto */
        }
      }
      if (beat.stream && beat.stream !== stream) beat.stream.getTracks().forEach((old) => old.stop());
      source.connect(beat.analyser); // al medidor (que sale en silencio): la canción suena como siempre
      const renew = () => {
        if (beat.stream === stream) beat.stale = true;
      };
      stream.addEventListener('addtrack', renew);
      stream.addEventListener('removetrack', renew);
      beat.source = source;
      beat.stream = stream;
      beat.track = track;
      beat.media = media;
      beat.stale = false;
      beat.hookedAt = performance.now();
      beat.quiet = 0;
      return true;
    } catch {
      return false;
    }
  }

  // El navegador no deja arrancar el audio sin un clic o una tecla: se reanuda con el primero que haya.
  function wakeBeat() {
    if (beat.ctx && beat.ctx.state === 'suspended') beat.ctx.resume().catch(() => {});
  }

  // Potencia media de una banda de frecuencias, en escala lineal (los datos vienen en decibelios).
  // Se mide así, y no con la escala de 0 a 255, porque con música fuerte esa escala se queda pegada al tope
  // y los golpes dejan de notarse.
  function bandPower(fromHz, toHz) {
    const step = beat.ctx.sampleRate / beat.analyser.fftSize;
    const lo = Math.max(1, Math.round(fromHz / step));
    const hi = Math.min(beat.data.length - 1, Math.max(lo, Math.round(toHz / step)));
    let sum = 0;
    for (let i = lo; i <= hi; i += 1) sum += 10 ** (beat.data[i] / 10);
    return sum / (hi - lo + 1);
  }

  function beatFrame(now) {
    beat.raf = 0;
    if (!wantsBeat()) {
      restBeat();
      return;
    }
    // El fondo cambia despacio. Evita recalcular audio y estilos a 60, 120 o 144 Hz.
    if (beat.then && now - beat.then < 32) {
      beat.raf = requestAnimationFrame(beatFrame);
      return;
    }
    const dt = Math.min(100, beat.then ? now - beat.then : 16);
    beat.then = now;
    const media = video();
    const playing = Boolean(media && !media.paused && !media.ended && !adPlaying());
    if (!playing) {
      restBeat();
      return;
    }
    const hearing = playing && beat.source && beat.ctx && beat.ctx.state === 'running';

    if (hearing) {
      beat.analyser.getFloatFrequencyData(beat.data);
      const bass = bandPower(40, 200);
      const power = bandPower(40, 4000);
      // Silencio total mientras la canción suena: la pista enganchada ya no es la que suena. Se engancha de nuevo.
      if (power > 1e-11) beat.quiet = 0;
      else if (!beat.quiet) beat.quiet = now;
      else if (now - beat.quiet > 2000 && performance.now() - beat.hookedAt > 4000) beat.stale = true;
      // golpe: los graves saltan por encima de su promedio reciente (da igual el volumen de la canción)
      const jump = bass / (beat.avg + 1e-12);
      if (jump > 1.5 && bass > 1e-5 && now - beat.last > 210) {
        beat.pulse = Math.min(1, beat.pulse * 0.4 + 0.55 + Math.min(0.45, (jump - 1.5) * 0.3));
        beat.last = now;
        beat.hits.push(now);
      }
      beat.avg += (bass - beat.avg) * Math.min(1, dt / 500);
      // volumen general, de 0 a 1: -65 dB es silencio y -30 dB una canción a todo dar
      const body = Math.min(1, Math.max(0, (10 * Math.log10(power + 1e-12) + 65) / 35));
      beat.level += (body - beat.level) * Math.min(1, dt / 400);
    } else {
      beat.level += (0 - beat.level) * Math.min(1, dt / 800);
    }
    beat.pulse *= Math.pow(0.86, dt / 16.7);
    while (beat.hits.length && now - beat.hits[0] > 8000) beat.hits.shift();

    // qué tan movida va la canción: golpes por segundo y volumen
    const perSecond = beat.hits.length / 8;
    const busy = Math.min(1, perSecond / 2.6) * 0.7 + Math.min(1, beat.level * 1.8) * 0.3;
    const target = hearing ? 0.7 + busy * 6 : playing ? 1 : 0.3;
    beat.rate += (target - beat.rate) * Math.min(1, dt / 1500);

    // Cada mancha da vueltas por su propio camino; la velocidad (beat.rate) sube con lo movida que va la canción.
    // Una vuelta completa a ritmo 1 tarda ~50 s; con una canción muy movida, unos 8 s.
    const step = (dt / 1000) * beat.rate * 0.12;
    const s = beat.box.style;
    beat.phase.forEach((value, i) => {
      const phase = value + step * (1 + i * 0.23);
      beat.phase[i] = phase;
      const n = i + 1;
      s.setProperty(`--mk-x${n}`, `${(Math.sin(phase) * 22 + Math.sin(phase * 0.53 + i) * 10).toFixed(2)}vmax`);
      s.setProperty(`--mk-y${n}`, `${(Math.cos(phase * 0.81 + i) * 18).toFixed(2)}vmax`);
      s.setProperty(`--mk-s${n}`, (1 + Math.sin(phase * 0.67 + i * 2) * 0.18).toFixed(3));
    });
    s.setProperty('--mk-pulse', beat.pulse.toFixed(3));
    s.setProperty('--mk-energy', beat.level.toFixed(3));
    if (lyGlow && lyricsOpen()) {
      [lyGlow, lyArt].forEach((node) => {
        node.style.setProperty('--mk-pulse', beat.pulse.toFixed(3));
        node.style.setProperty('--mk-energy', beat.level.toFixed(3));
      });
    }
    if (now - beat.rateAt > 200) {
      beat.rateAt = now;
      beat.box.dataset.mkRate = beat.rate.toFixed(2);
      beat.box.dataset.mkHits = String(beat.hits.length);
      beat.box.dataset.mkAudio = hearing ? 'escuchando' : beat.off ? 'sin-acceso' : playing ? 'esperando' : 'en-pausa';
    }
    beat.raf = requestAnimationFrame(beatFrame);
  }

  function restBeat() {
    beat.then = 0;
    beat.pulse = 0;
    beat.rate = 1;
    if (!beat.box) return;
    [beat.box, lyGlow, lyArt].forEach((node) => {
      if (!node) return;
      node.style.setProperty('--mk-pulse', '0');
      node.style.setProperty('--mk-energy', '0');
    });
  }

  // Se llama cada poco: engancha el sonido de la canción que suena y arranca el cuadro por cuadro.
  function updateBeat() {
    if (!beat.box || !wantsBeat()) return;
    const media = video();
    if (media && !media.paused) {
      listenTo(media);
      wakeBeat();
    } else return;
    if (!beat.raf) beat.raf = requestAnimationFrame(beatFrame);
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

  // Botón de letra en vivo junto a los controles de la barra del reproductor.
  let barLyrics = null;

  function placeBarLyrics() {
    const host = document.querySelector('ytmusic-player-bar .left-controls');
    if (!host) return;
    if (!barLyrics) {
      barLyrics = el(
        'button',
        {
          id: 'mk-bar-lyrics',
          type: 'button',
          title: 'Letra en vivo',
          'aria-label': 'Mostrar la letra en vivo',
          onclick: () => toggleLyrics(!lyricsOpen()),
        },
        icon(['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z', 'M20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z']),
        el('span', { text: 'Letra' }),
      );
    }
    if (barLyrics.parentElement !== host) host.appendChild(barLyrics);
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

  let fullButton;
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {
      fullButton.title = 'La ventana no permitió activar la pantalla completa';
    }
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
        title: 'Letra sincronizada (Ctrl + L)',
        'aria-label': 'Mostrar la letra sincronizada',
        onclick: () => toggleLyrics(!lyricsOpen()),
      },
      icon(['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z', 'M20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z']),
      el('span', { text: 'Letra en vivo' }),
    );
    fullButton = el('button', {
      id: 'mk-fullscreen', type: 'button', onclick: toggleFullscreen,
    }, icon(['M8 3H3v5', 'M16 3h5v5', 'M21 16v5h-5', 'M3 16v5h5']));
    const reflectFullscreen = () => {
      const active = Boolean(document.fullscreenElement);
      fullButton.setAttribute('aria-pressed', String(active));
      fullButton.title = active ? 'Salir de pantalla completa (F11)' : 'Pantalla completa (F11)';
      fullButton.setAttribute('aria-label', fullButton.title);
    };
    reflectFullscreen();
    document.addEventListener('fullscreenchange', reflectFullscreen);
    tools = el('div', { id: 'mk-tools' }, lyricsButton, fullButton, fab);

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
            ['music', 'Con la música'],
            ['calm', 'Suave'],
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
        section('Tamaño', false, slider('Zoom de la interfaz', 'zoom', 80, 130, '%')),
        section(
          'Cuenta',
          false,
          el('button', {
            class: 'mk-wide',
            type: 'button',
            text: 'Iniciar sesión con Google',
            onclick: () => ipcRenderer.send('mk:signin'),
          }),
          el('p', {
            class: 'mk-hint',
            text: 'Se abre dentro de MoniMusic (no en el navegador) y la sesión queda guardada. Si ya entraste, te regresa a tu música.',
          }),
        ),
      ),
      el(
        'footer',
        { class: 'mk-foot' },
        el('span', { text: 'Ctrl + ,  diseño   ·   Ctrl + L  letra' }),
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
  const ly = { key: '', lines: [], status: 'idle', active: -1, nodes: [], hold: 0, centeredAt: 0, recenter: false };
  let lyricsBox = null;
  let lyScroll = null;
  let lyCover = null;
  let lyBg = null;
  let lyTitle = null;
  let lyArtist = null;
  let lyNote = null;
  let lyGlow = null;
  let lyArt = null;
  let translateButton, translationNote;
  let translationJob = null;
  let useOnline = !globalThis.Translator;

  function stopTranslation() {
    ly.recenter = true;
    translationJob?.abort();
    translationJob = null;
    lyricsBox.removeAttribute('data-translated');
    translateButton.setAttribute('aria-pressed', 'false');
    translateButton.textContent = useOnline ? 'Traducir con MyMemory' : 'Traducir al español';
    translateButton.title = useOnline ? 'Enviar los versos en inglés a MyMemory para traducirlos al español' : 'Traducir del inglés al español en este equipo';
    translationNote.textContent = '';
  }

  async function toggleTranslation() {
    if (lyricsBox.hasAttribute('data-translated')) return stopTranslation();
    if (!ly.nodes.length) return;
    const job = new AbortController();
    translationJob = job;
    lyricsBox.setAttribute('data-translated', '');
    ly.recenter = true;
    translateButton.setAttribute('aria-pressed', 'true');
    translateButton.textContent = 'Ocultar español';
    translationNote.textContent = useOnline ? 'Traduciendo…' : 'Preparando el traductor local…';
    let engine;
    try {
      if (!useOnline) engine = await Translator.create({ sourceLanguage: 'en', targetLanguage: 'es', signal: job.signal });
      const first = Math.max(0, ly.active);
      const known = new Map();
      for (let i = 0; i < ly.lines.length; i++) {
        const index = (first + i) % ly.lines.length;
        const line = ly.lines[index];
        if (job.signal.aborted) return;
        if (!line.text.trim() || line.es) continue;
        let translated = known.get(line.text);
        if (!translated) {
          if (engine) translated = await engine.translate(line.text, { signal: job.signal });
          else {
            const query = new URLSearchParams({ q: line.text, langpair: 'en|es' });
            const response = await fetch('https://api.mymemory.translated.net/get?' + query, {
              credentials: 'omit', referrerPolicy: 'no-referrer',
              signal: AbortSignal.any([job.signal, AbortSignal.timeout(10000)]),
            });
            if (!response.ok) throw new Error('red');
            const data = await response.json();
            if (Number(data.responseStatus) !== 200 || !data.responseData?.translatedText) throw new Error('servicio');
            translated = data.responseData.translatedText;
          }
          known.set(line.text, translated);
        }
        if (job.signal.aborted) return;
        line.es = translated;
        ly.nodes[index].appendChild(el('span', { class: 'mk-translation', lang: 'es', text: translated }));
        if (index <= ly.active) ly.recenter = true;
      }
      translationNote.textContent = '';
    } catch {
      if (job.signal.aborted) return;
      const wasLocal = !useOnline;
      useOnline = true;
      stopTranslation();
      translationNote.textContent = wasLocal ? 'Traducción local no disponible. Puedes usar MyMemory.' : 'No se pudo completar la traducción. Inténtalo más tarde.';
    } finally {
      engine?.destroy();
      if (translationJob === job) translationJob = null;
    }
  }

  const lyricsOpen = () => root.hasAttribute('data-mk-lyrics');

  function toggleLyrics(open) {
    root.toggleAttribute('data-mk-lyrics', open);
    if (open) {
      layoutLyrics();
      if (ly.status === 'none') ly.key = '';
      ly.hold = 0;
      ly.centeredAt = 0;
      updateLyrics();
      tickLyrics();
    } else {
      stopTranslation();
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
    const offset = Number(text.match(/\[offset:\s*([+-]?\d+)\s*\]/i)?.[1] || 0) / 1000;
    text.split(/\r?\n/).forEach((raw) => {
      const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if (!stamps.length) return;
      const words = raw.replace(/\[[^\]]*\]/g, '').trim();
      stamps.forEach((stamp) => lines.push({ t: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) - offset), text: words }));
    });
    return lines.sort((a, b) => a.t - b.t);
  }

  function setState(state) {
    ly.status = state;
    if (state !== 'synced' && state !== 'plain') stopTranslation();
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
      const node = el('p', { class: `mk-line${synced ? '' : ' mk-plain'}` },
        el('span', { class: 'mk-original', text: line.text || (synced ? '♪' : ' ') }));
      if (synced) {
        node.addEventListener('click', () => {
          seekTo(line.t);
          ly.hold = 0; // tocar una línea no cuenta como moverla a mano: la letra la sigue al instante
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
      if (ly.status !== 'waiting') {
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
    ly.hold = 0;
    setState('loading');
    ly.lines = [];
    lyTitle.textContent = info.title;
    lyArtist.textContent = info.artist;
    setArt(currentArt);
    lyNote.textContent = '';
    showMessage('Buscando la letra…');

    let result = null;
    try {
      result = await ipcRenderer.invoke('mk:lyrics', info);
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

  function layoutLyrics() {
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
  }

  function tickLyrics() {
    if (!lyricsBox || !lyricsOpen() || document.hidden) return;
    if (ly.status !== 'synced' && ly.status !== 'plain') return;
    const head = playhead();
    if (ly.status === 'plain') {
      // Sin tiempos no se puede marcar línea por línea: el texto baja al ritmo de la canción.
      // Si la persona mueve la letra a mano, se le deja en paz unos segundos.
      if (head && head.total > 0 && !adPlaying() && Date.now() > ly.hold) {
        const room = lyScroll.scrollHeight - lyScroll.clientHeight;
        const target = Math.round(room * Math.min(1, head.t / head.total));
        if (Math.abs(target - lyScroll.scrollTop) > 6) lyScroll.scrollTo({ top: target, behavior: 'smooth' });
      }
      return;
    }
    if (!head || adPlaying()) return;
    const now = head.t;
    let lo = 0;
    let hi = ly.lines.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (ly.lines[mid].t <= now) lo = mid + 1;
      else hi = mid;
    }
    const index = lo - 1;
    const current = ly.nodes[index];
    if (current) {
      const end = ly.lines[index + 1]?.t ?? head.total;
      const fraction = Math.min(1, (now - ly.lines[index].t) / Math.max(0.01, end - ly.lines[index].t));
      current.style.setProperty('--mk-fill', `${((1 - fraction) * 100).toFixed(1)}%`);
    }
    if (index === ly.active && (Date.now() < ly.hold || (!ly.recenter && Date.now() - ly.centeredAt < 1500))) return;
    ly.recenter = false;
    // Dónde debería estar la letra: la línea que suena al centro; antes de la primera, arriba del todo.
    const spot = current ? Math.max(0, current.offsetTop - lyScroll.clientHeight / 2 + current.clientHeight / 2) : 0;
    const follow = () => {
      ly.centeredAt = Date.now();
      lyScroll.scrollTo({ top: spot, behavior: calmMotion.matches ? 'instant' : 'smooth' });
    };
    if (index === ly.active) {
      // Si la letra quedó lejos (la canción volvió a empezar, saltó, o la persona la movió y ya la soltó),
      // vuelve sola a la línea que suena.
      const room = Math.max(0, lyScroll.scrollHeight - lyScroll.clientHeight);
      const off = Math.abs(Math.min(spot, room) - lyScroll.scrollTop);
      ly.centeredAt = Date.now();
      if (off > 12) follow();
      return;
    }
    const previous = ly.active;
    ly.nodes[previous]?.classList.remove('mk-active');
    for (let i = Math.max(0, Math.min(previous, index)); i <= Math.max(previous, index); i++) {
      ly.nodes[i].classList.toggle('mk-past', i < index);
    }
    current?.classList.add('mk-active');
    ly.active = index;
    if (Date.now() > ly.hold) follow();
  }

  function buildLyrics() {
    if (document.getElementById('mk-lyrics')) return;
    lyBg = el('img', { alt: '' });
    lyCover = el('img', { class: 'mk-ly-cover', alt: '' });
    lyTitle = el('div', { class: 'mk-ly-title' });
    lyArtist = el('div', { class: 'mk-ly-artist' });
    lyNote = el('div', { class: 'mk-ly-note' });
    lyScroll = el('div', { class: 'mk-ly-scroll' });
    new ResizeObserver(() => { ly.recenter = true; }).observe(lyScroll);
    // luz que late con la música detrás de la letra, y la portada que acompaña el golpe
    lyGlow = el('div', { class: 'mk-ly-glow' });
    lyArt = el('div', { class: 'mk-ly-art' }, el('div', { class: 'mk-ly-disc', 'aria-hidden': 'true' }), lyCover);
    ['wheel', 'touchmove', 'pointerdown'].forEach((type) => {
      lyScroll.addEventListener(type, () => { ly.hold = Date.now() + 7000; }, { passive: true });
    });
    const close = el('button', {
      class: 'mk-ly-close',
      type: 'button',
      'aria-label': 'Cerrar la letra',
      onclick: () => toggleLyrics(false),
    });
    translateButton = el('button', { class: 'mk-translate', type: 'button', onclick: toggleTranslation });
    translationNote = el('span', { class: 'mk-translation-note', role: 'status' });
    close.appendChild(icon(['M6 6l12 12', 'M18 6L6 18']));
    lyricsBox = el(
      'section',
      { id: 'mk-lyrics', 'aria-label': 'Letra sincronizada', 'data-state': 'idle' },
      // fondo: la misma portada, muy desenfocada
      el('div', { class: 'mk-ly-bg', 'aria-hidden': 'true' }, lyBg, lyGlow),
      el(
        'div',
        { class: 'mk-ly-side' },
        // portada con un disco que asoma y gira mientras suena
        lyArt,
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
      el('div', { class: 'mk-ly-actions' }, translationNote, translateButton, close),
    );
    stopTranslation();
    document.body.appendChild(lyricsBox);
    if (!useOnline) {
      Translator.availability({ sourceLanguage: 'en', targetLanguage: 'es' }).then((status) => {
        if (status === 'unavailable' && !translationJob) {
          useOnline = true;
          stopTranslation();
        }
      }).catch(() => {});
    }
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
      step('letra en la barra', placeBarLyrics);
      step('ritmo del fondo', updateBeat);
      step('acceso a la letra', placeLyricsCta);
      step('letra', updateLyrics);
      step('espacio de la letra', layoutLyrics);
      if (lyricsOpen() && currentArt && ly.status !== 'empty') setArt(currentArt);
      step('barra fluida', smoothBar);
      step('navegación', onNavigate);
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
    window.addEventListener('resize', layoutLyrics);
    for (const event of ['seeked', 'playing', 'loadedmetadata']) {
      document.addEventListener(event, () => {
        if (document.hidden) return;
        smoothBar();
        if (event === 'playing') updateBeat();
        updateLyrics();
        tickLyrics();
      }, true);
    }
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('yt-navigate-finish', onNavigate);

    setInterval(() => {
      if (lyricsOpen() && !document.hidden) step('letra', tickLyrics);
    }, 100);

    // el audio del medidor arranca con el primer clic o tecla (regla de los navegadores)
    window.addEventListener('pointerdown', wakeBeat, true);
    window.addEventListener('keydown', wakeBeat, true);

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'f11' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        if (!event.repeat) toggleFullscreen();
      } else if (event.ctrlKey && key === ',') {
        event.preventDefault();
        togglePanel(!panelOpen());
      } else if (event.ctrlKey && !event.shiftKey && !event.altKey && key === 'l') {
        event.preventDefault();
        toggleLyrics(!lyricsOpen());
      } else if (key === 'escape' && !document.fullscreenElement) {
        if (panelOpen()) togglePanel(false);
        else if (lyricsOpen()) toggleLyrics(false);
      }
    });
  }

  whenReady(start);
}
