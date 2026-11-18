// Genera app/src/inject.js: el script que la app de Rust (Tauri) inyecta en YouTube Music.
// Sale de los mismos archivos de siempre: preload.js, theme.css, panel.css, la búsqueda de letras de main.js y el logo.
// Uso: npm run app:inject   (lo llama también npm run app)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
// Se normalizan los saltos de línea: en Windows git puede entregar los archivos con CRLF.
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`no encuentro "${String(from).slice(0, 70)}"`);
  return text.split(from).join(to);
};
const cut = (text, startMark, endMark, replacement) => {
  const a = text.indexOf(startMark);
  const b = text.indexOf(endMark, a);
  if (a < 0 || b < 0) throw new Error(`no encuentro el bloque "${startMark.slice(0, 50)}"`);
  return text.slice(0, a) + replacement + text.slice(b);
};

// ---------- el código de la interfaz (de preload.js) ----------
let js = read('preload.js');
js = swap(js, `const { ipcRenderer, webFrame } = require('electron');\n\nconst HOME = 'https://music.youtube.com/';\n`, '');
js = cut(js, `// ---------- fuera de YouTube Music (inicio de sesión): botón para volver ----------`, `function music() {`, `music();\n\n`);
js = swap(js, `    ipcRenderer.send('mk:theme', on);\n`, `    mkTheme(on);\n`);
js = swap(js, `    webFrame.setZoomFactor(settings.zoom / 100);\n`, '');
js = swap(js, `  ipcRenderer.send('mk:theme', enabled());`, `  mkTheme(enabled());`);
js = swap(
  js,
  `  ipcRenderer
    .invoke('mk:logos')
    .then((files) => {
      logoFiles = files || logoFiles;
      paintLogos();
    })
    .catch(() => {});`,
  `  logoFiles = { still: MONI.logo };`,
);
js = swap(js, `        section('Tamaño', false, slider('Zoom de la interfaz', 'zoom', 80, 130, '%')),\n`, '');
js = cut(js, `        section(\n          'Cuenta',`, `      el(\n        'footer',`, `      ),\n`);
js = swap(js, `result = await ipcRenderer.invoke('mk:lyrics', info);`, `result = await findLyrics(info);`);
js = swap(
  js,
  `} else if (event.ctrlKey && !event.shiftKey && !event.altKey && key === 'l') {`,
  `} else if (event.ctrlKey !== event.altKey && !event.shiftKey && key === 'l') {`,
);
if (/ipcRenderer|webFrame|require\(/.test(js)) throw new Error('quedó código de Electron');

// ---------- la búsqueda de letras (de main.js), con fetch del navegador ----------
const main = read('main.js');
const a = main.indexOf(`// ---------- letra sincronizada (LRCLIB`);
const b = main.indexOf(`// ---------- ventana ----------`);
if (a < 0 || b < 0) throw new Error('no encuentro el bloque de la letra en main.js');
let lyrics = main.slice(a, b);
lyrics = swap(lyrics, `await net.fetch(`, `await fetch(`);
lyrics = swap(lyrics, `    headers: { 'User-Agent': 'MoniMusic/1.0 (reproductor de escritorio)' },\n`, '');

// ---------- recursos incrustados ----------
const logo = `data:image/png;base64,${fs.readFileSync(path.join(root, 'assets', 'logo.png')).toString('base64')}`;
const MONI = { theme: read('theme.css'), panel: read('panel.css'), logo };

const out = `// MoniMusic (app de Rust) — script que se inyecta en YouTube Music.
// Archivo generado por tools/build-app.js: edita preload.js, theme.css o panel.css, no este.
(() => {
  if (window.top !== window || location.hostname !== 'music.youtube.com' || window.__moniMusic) return;
  window.__moniMusic = true;

  const MONI = ${JSON.stringify(MONI)};

  // ---------- estilos: el panel va siempre; el tema se puede apagar (tema "Clásico") ----------
  const sheets = {};
  const fallback = {};
  function sheet(name) {
    if (!(name in sheets)) {
      try {
        const made = new CSSStyleSheet();
        made.replaceSync(MONI[name]);
        sheets[name] = made;
      } catch {
        sheets[name] = null;
      }
    }
    return sheets[name];
  }
  function useSheet(name, on) {
    const made = sheet(name);
    if (made) {
      const rest = document.adoptedStyleSheets.filter((item) => item !== made);
      document.adoptedStyleSheets = on ? [...rest, made] : rest;
      return;
    }
    // respaldo: una etiqueta <style> cuando no hay hojas construidas
    if (on && !fallback[name]) {
      const tag = document.createElement('style');
      tag.textContent = MONI[name];
      (document.head || document.documentElement).appendChild(tag);
      fallback[name] = tag;
    } else if (!on && fallback[name]) {
      fallback[name].remove();
      fallback[name] = null;
    }
  }
  function mkTheme(on) {
    useSheet('theme', Boolean(on));
  }
  useSheet('panel', true);

${lyrics}
${js}
})();
`;

const target = path.join(root, 'app', 'src', 'inject.js');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
fs.mkdirSync(path.join(root, 'app', 'icons'), { recursive: true });
fs.copyFileSync(path.join(root, 'assets', 'icon.ico'), path.join(root, 'app', 'icons', 'icon.ico'));
console.log(`inject.js listo (${Math.round(out.length / 1024)} KB)`);
