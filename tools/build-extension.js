// Genera la extensión de navegador de MoniMusic en ./extension a partir de los mismos archivos de la app:
// preload.js -> content.js, theme.css y panel.css adaptados, y un background.js para la letra.
// Uso: npm run extension
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'extension');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const swap = (label, text, from, to) => {
  if (!text.includes(from)) throw new Error(`${label}: no encuentro "${String(from).slice(0, 70)}"`);
  return text.split(from).join(to);
};
const cut = (label, text, startMark, endMark, replacement) => {
  const a = text.indexOf(startMark);
  const b = text.indexOf(endMark, a);
  if (a < 0 || b < 0) throw new Error(`${label}: no encuentro el bloque "${startMark.slice(0, 50)}"`);
  return text.slice(0, a) + replacement + text.slice(b);
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });

// ---------------- content.js ----------------
let js = read('preload.js');
js = swap('content', js, `// MoniMusic — se ejecuta dentro de la página (YouTube Music o el inicio de sesión de Google).`, `// MoniMusic (extensión) — se ejecuta dentro de YouTube Music.\n// Archivo generado por tools/build-extension.js a partir de preload.js: edita preload.js, no este.`);
js = swap('content', js, `const { ipcRenderer, webFrame } = require('electron');\n\nconst HOME = 'https://music.youtube.com/';\n`, '');
js = cut('content', js, `// ---------- fuera de YouTube Music (inicio de sesión): botón para volver ----------`, `function music() {`, `music();\n\n`);
js = swap('content', js, `    ipcRenderer.send('mk:theme', on);\n`, '');
js = swap('content', js, `    webFrame.setZoomFactor(settings.zoom / 100);\n`, '');
js = swap(
  'content',
  js,
  `  // El tema se decide antes de que cargue la página para que no parpadee.\n  ipcRenderer.send('mk:theme', enabled());`,
  `  // Con el tema "Clásico" se marca <html> desde el arranque para que no parpadee el tema.\n  if (!enabled() && document.documentElement) document.documentElement.setAttribute('data-mk-off', '');`,
);
js = swap(
  'content',
  js,
  `  ipcRenderer
    .invoke('mk:logos')
    .then((files) => {
      logoFiles = files || logoFiles;
      paintLogos();
    })
    .catch(() => {});`,
  `  logoFiles = { still: chrome.runtime.getURL('assets/logo.png') };`,
);
js = swap('content', js, `        section('Tamaño', false, slider('Zoom de la interfaz', 'zoom', 80, 130, '%')),\n`, '');
js = cut('content', js, `        section(\n          'Cuenta',`, `      el(\n        'footer',`, `      ),\n`);
js = swap('content', js, `result = await ipcRenderer.invoke('mk:lyrics', info);`, `result = await chrome.runtime.sendMessage({ type: 'lyrics', info });`);
js = swap('content', js, `title: 'Letra sincronizada (Ctrl + L)',`, `title: 'Letra sincronizada (Alt + L)',`);
js = swap('content', js, `'Ctrl + ,  diseño   ·   Ctrl + L  letra'`, `'Ctrl + ,  diseño   ·   Alt + L  letra'`);
js = swap(
  'content',
  js,
  `} else if (event.ctrlKey && !event.shiftKey && !event.altKey && key === 'l') {`,
  `} else if (event.altKey && !event.ctrlKey && !event.shiftKey && key === 'l') {`,
);
if (/ipcRenderer|webFrame|require\(/.test(js)) throw new Error('content: quedó código de Electron');
fs.writeFileSync(path.join(out, 'content.js'), js);

// ---------------- theme.css ----------------
// Va declarado en el manifiesto (siempre cargado) y se apaga con html[data-mk-off] gracias a @scope.
let theme = read('theme.css');
theme = theme
  .replace(/^:root \{/m, ':scope {')
  .replace(/^html\[/gm, ':scope[')
  .replace(/^html \{/m, ':scope {');
if (/^(html|:root)\b/m.test(theme)) throw new Error('theme: quedó un selector html/:root sin convertir');
theme = `/* Generado por tools/build-extension.js a partir de theme.css: edita theme.css, no este. */\n@scope (html:not([data-mk-off])) {\n${theme}\n}\n`;
fs.writeFileSync(path.join(out, 'theme.css'), theme);

// ---------------- panel.css ----------------
let panel = read('panel.css');
// Se usa tal cual: el hueco para los botones de la ventana se calcula solo (ver --mk-wco en panel.css).
panel = `/* Generado por tools/build-extension.js a partir de panel.css: edita panel.css, no este. */\n${panel}`;
fs.writeFileSync(path.join(out, 'panel.css'), panel);

// ---------------- background.js ----------------
let main = read('main.js');
const a = main.indexOf(`// ---------- letra sincronizada (LRCLIB`);
const b = main.indexOf(`// ---------- ventana ----------`);
if (a < 0 || b < 0) throw new Error('background: no encuentro el bloque de la letra en main.js');
let lyrics = main.slice(a, b);
lyrics = swap('background', lyrics, `await net.fetch(`, `await fetch(`);
lyrics = swap('background', lyrics, `    headers: { 'User-Agent': 'MoniMusic/1.0 (reproductor de escritorio)' },\n`, '');
fs.writeFileSync(
  path.join(out, 'background.js'),
  `// MoniMusic (extensión) — busca la letra con tiempos en LRCLIB cuando la página la pide.
// Generado por tools/build-extension.js a partir de main.js.

${lyrics}
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (!message || message.type !== 'lyrics') return false;
  findLyrics(message.info || {})
    .then(respond)
    .catch(() => respond(null));
  return true; // la respuesta llega después
});
`,
);

// ---------------- manifest y recursos ----------------
const pkg = JSON.parse(read('package.json'));
fs.writeFileSync(
  path.join(out, 'manifest.json'),
  `${JSON.stringify(
    {
      manifest_version: 3,
      name: 'MoniMusic',
      version: pkg.version,
      description: 'Tema con los colores de la portada, panel de diseño y letra sincronizada para YouTube Music.',
      icons: { 128: 'assets/icon.png' },
      content_scripts: [
        {
          matches: ['https://music.youtube.com/*'],
          css: ['panel.css', 'theme.css'],
          js: ['content.js'],
          run_at: 'document_start',
        },
      ],
      background: { service_worker: 'background.js' },
      host_permissions: ['https://lrclib.net/*'],
      web_accessible_resources: [{ resources: ['assets/logo.png'], matches: ['https://music.youtube.com/*'] }],
    },
    null,
    2,
  )}\n`,
);
['icon.png', 'logo.png'].forEach((name) => fs.copyFileSync(path.join(root, 'assets', name), path.join(out, 'assets', name)));

console.log(`Extensión lista en ${out}`);
