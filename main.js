// MoniMusic — ventana de escritorio con diseño propio para YouTube Music.
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, net, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const HOME = 'https://music.youtube.com/';
const SIGN_IN = `https://accounts.google.com/ServiceLogin?service=youtube&continue=${encodeURIComponent(HOME)}`;
const ICON = path.join(__dirname, 'assets', 'icon.png');
const THEME = path.join(__dirname, 'theme.css');
const PANEL = path.join(__dirname, 'panel.css');
const NAME = 'MoniMusic';
const ASSETS = path.join(__dirname, 'assets');

app.setName(NAME);
app.setAppUserModelId('gt.moni.music');

// Perfil (sesión de Google, ajustes). Si quedó uno del nombre anterior, se conserva.
const profile = path.join(app.getPath('appData'), NAME);
try {
  const old = path.join(app.getPath('appData'), 'Monky Music');
  if (!fs.existsSync(profile) && fs.existsSync(old)) fs.renameSync(old, profile);
} catch {
  /* si el perfil anterior está en uso, se empieza uno nuevo */
}
app.setPath('userData', profile);

// El logo se entrega a la página como data URL (quieto y animado).
const dataUrl = (name, type) => {
  try {
    return `data:${type};base64,${fs.readFileSync(path.join(ASSETS, name)).toString('base64')}`;
  } catch {
    return '';
  }
};

// YouTube Music sirve la versión correcta del sitio con un user agent de Chrome normal.
const chromeMajor = process.versions.chrome.split('.')[0];
app.userAgentFallback =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

// Modo de prueba (--shot=archivo.png): perfil temporal aparte, para no tocar la sesión ni los ajustes reales.
const SHOT = arg('shot');
// --shot-ext=carpeta: prueba la extensión de navegador en vez del preload de la app.
const EXT = SHOT ? arg('shot-ext') : null;
if (SHOT) {
  app.setPath('userData', path.join(app.getPath('temp'), 'monimusic-pruebas'));
}

let win = null;
let tray = null;

// ---------- tamaño y posición de la ventana ----------
const stateFile = () => path.join(app.getPath('userData'), 'window.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { width: 1320, height: 860 };
  }
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {
    /* no es crítico */
  }
}

// ---------- controles del reproductor ----------
function player(action) {
  if (!win || win.isDestroyed()) return;
  // YouTube Music tiene dos versiones de la barra del reproductor; se prueba con las dos.
  const selector = {
    toggle: 'ytmusic-player-bar #play-pause-button, ytmusic-miniplayer .ytmusicPlayerControlsPlayPauseButton button',
    next: 'ytmusic-player-bar .next-button, ytmusic-miniplayer .ytmusicPlayerControlsNextButton button',
    prev: 'ytmusic-player-bar .previous-button, ytmusic-miniplayer .ytmusicPlayerControlsPreviousButton button',
  }[action];
  win.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)})?.click()`).catch(() => {});
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createTray() {
  if (!fs.existsSync(ICON)) return;
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip(NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Reproducir / Pausar', click: () => player('toggle') },
      { label: 'Siguiente', click: () => player('next') },
      { label: 'Anterior', click: () => player('prev') },
      { type: 'separator' },
      { label: `Mostrar ${NAME}`, click: showWindow },
      { label: 'Salir', click: () => app.quit() },
    ]),
  );
  tray.on('click', showWindow);
}

// ---------- letra sincronizada (LRCLIB, servicio público y gratuito) ----------
const LRCLIB = 'https://lrclib.net/api';

// "Canción (Official Video)" -> "Canción"
const cleanTitle = (title) =>
  title
    .replace(/\s*[([][^)\]]*(official|oficial|video|audio|lyric|letra|visualizer|remaster|hd|4k)[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+(official|oficial).*$/i, '')
    .trim() || title;

const firstArtist = (artist) => artist.split(/,|&|•| feat\.? | ft\.? | x /i)[0].trim();

async function lrclib(pathname, params) {
  const response = await net.fetch(`${LRCLIB}${pathname}?${new URLSearchParams(params)}`, {
    headers: { 'User-Agent': 'MoniMusic/1.0 (reproductor de escritorio)' },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function findLyrics({ title, artist, duration }) {
  const track = cleanTitle(String(title || ''));
  const by = firstArtist(String(artist || ''));
  const length = Number(duration) || 0;
  if (!track) return null;
  const pack = (hit) => (hit ? { synced: hit.syncedLyrics || null, plain: hit.plainLyrics || null } : null);

  // 1) coincidencia exacta por título, artista y duración
  if (by && length) {
    try {
      const exact = await lrclib('/get', { track_name: track, artist_name: by, duration: String(Math.round(length)) });
      if (exact && exact.syncedLyrics) return pack(exact);
    } catch {
      /* se intenta la búsqueda */
    }
  }

  // 2) búsqueda: la que tenga tiempos y la duración más parecida
  try {
    const query = by ? { track_name: track, artist_name: by } : { q: track };
    const hits = (await lrclib('/search', query)) || [];
    const closest = (list) =>
      list.sort((a, b) => Math.abs((a.duration || 0) - length) - Math.abs((b.duration || 0) - length))[0];
    const synced = hits.filter((hit) => hit.syncedLyrics);
    const near = synced.filter((hit) => !length || Math.abs((hit.duration || 0) - length) <= 4);
    if (near.length) return pack(closest(near));
    const plain = hits.filter((hit) => hit.plainLyrics);
    // con otra duración los tiempos no cuadrarían: se muestra solo el texto
    if (synced.length || plain.length) {
      const hit = closest(synced.length ? synced : plain);
      return { synced: null, plain: hit.plainLyrics || null };
    }
  } catch {
    /* sin conexión o sin resultados */
  }
  return null;
}

// ---------- ventana ----------
const isMusic = (url) => {
  try {
    return new URL(url).hostname === 'music.youtube.com';
  } catch {
    return false;
  }
};

const isGoogle = (url) => {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)(google\.[a-z.]+|youtube\.com|gstatic\.com|googleusercontent\.com)$/.test(host);
  } catch {
    return false;
  }
};

// En páginas que no son YouTube Music (inicio de sesión) solo dejamos una franja para mover la ventana.
const DRAG_STRIP = `
  html::before {
    content: ''; position: fixed; top: 0; left: 230px; right: 150px; height: 28px;
    -webkit-app-region: drag; z-index: 2147483647;
  }`;

function createWindow() {
  const state = loadState();
  const size = (arg('shot-size') || '').split('x').map(Number);
  if (SHOT && size.length === 2 && size[0] && size[1]) {
    Object.assign(state, { width: size[0], height: size[1], x: 0, y: 0, maximized: false });
  }

  win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 480,
    minHeight: 560,
    show: false,
    title: NAME,
    icon: fs.existsSync(ICON) ? ICON : undefined,
    backgroundColor: '#07070b',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#ece9f5', height: 40 },
    webPreferences: {
      preload: EXT ? undefined : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

// Para que al anclarla a la barra de tareas conserve su nombre, su icono y abra esta misma app.
  if (process.platform === 'win32' && !SHOT) {
    win.setAppDetails({
      appId: 'gt.moni.music',
      appIconPath: path.join(ASSETS, 'icon.ico'),
      appIconIndex: 0,
      relaunchCommand: app.isPackaged ? '"' + process.execPath + '"' : '"' + process.execPath + '" "' + __dirname + '"',
      relaunchDisplayName: NAME,
    });
  }

  Menu.setApplicationMenu(null);
  if (state.maximized) win.maximize();

  const wc = win.webContents;

  // El tema se puede apagar desde el panel de diseño (tema "Clásico"): el preload avisa por IPC.
  let themeOn = true;
  let themeKey = null;
  let pageReady = false;
  let queue = Promise.resolve();
  const syncTheme = () => {
    queue = queue
      .then(async () => {
        if (!pageReady || wc.isDestroyed()) return;
        if (themeOn && !themeKey) {
          themeKey = await wc.insertCSS(fs.readFileSync(THEME, 'utf8'));
        } else if (!themeOn && themeKey) {
          const key = themeKey;
          themeKey = null;
          await wc.removeInsertedCSS(key);
        }
      })
      .catch(() => {});
  };

  // Botón "Iniciar sesión con Google" del panel: abre la pantalla de Google dentro de la app.
  ipcMain.on('mk:signin', (event) => {
    if (event.sender === wc) wc.loadURL(SIGN_IN);
  });

  ipcMain.handle('mk:lyrics', (event, info) => (event.sender === wc && info ? findLyrics(info) : null));

  ipcMain.on('mk:theme', (event, on) => {
    if (event.sender !== wc) return;
    themeOn = Boolean(on);
    syncTheme();
  });

  wc.on('did-navigate', () => {
    pageReady = false;
    themeKey = null;
  });

  wc.on('dom-ready', () => {
    if (EXT) return; // la extensión trae sus propios estilos
    if (isMusic(wc.getURL())) {
      wc.insertCSS(fs.readFileSync(PANEL, 'utf8')).catch(() => {});
      pageReady = true;
      syncTheme();
    } else {
      wc.insertCSS(DRAG_STRIP).catch(() => {});
    }
  });

  wc.on('page-title-updated', (event, title) => {
    event.preventDefault();
    win.setTitle(title.replace('YouTube Music', NAME));
  });

  // Los enlaces externos se abren en el navegador normal.
  wc.setWindowOpenHandler(({ url }) => {
    if (isGoogle(url)) wc.loadURL(url);
    else if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (event, url) => {
    if (!isGoogle(url)) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      wc.reload();
      event.preventDefault();
    } else if (input.key === 'F12') {
      wc.toggleDevTools();
      event.preventDefault();
    }
  });

  win.once('ready-to-show', () => win.show());
  win.on('close', saveState);
  win.on('closed', () => {
    win = null;
  });

  wc.loadURL((SHOT && arg('shot-url')) || HOME);

  // Modo de prueba: `--shot=archivo.png` guarda una captura y cierra la app.
  const shot = SHOT;
  if (shot) {
    const delay = Number(arg('shot-delay')) || 9000;
    const evalFile = arg('shot-eval');
    const logs = [];
    wc.on('console-message', (event) => {
      if (/monimusic/i.test(event.message) || event.level === 'error') logs.push(`[${event.level}] ${event.message}`);
    });
    wc.once('did-finish-load', async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        if (evalFile) {
          await wait(4000);
          const result = await wc.executeJavaScript(fs.readFileSync(evalFile, 'utf8'), true);
          fs.writeFileSync(`${shot}.eval.json`, JSON.stringify(result, null, 2) || 'null');
        }
        // --shot-click=selector: clic real con el ratón sobre ese elemento, y se anota a dónde llevó.
        const clickOn = arg('shot-click');
        if (clickOn) {
          if (!evalFile) await wait(4000);
          const target = await wc.executeJavaScript(`(() => {
            const node = document.querySelector(${JSON.stringify(clickOn)});
            if (!node) return null;
            const r = node.getBoundingClientRect();
            const x = Math.round(r.left + r.width / 2);
            const y = Math.round(r.top + r.height / 2);
            const hit = document.elementFromPoint(x, y);
            return { x, y, href: node.href || null, target: node.target || null, hit: hit ? hit.tagName + '.' + hit.className : null };
          })()`);
          const events = [];
          wc.on('will-navigate', (_e, url) => events.push(`will-navigate ${url.slice(0, 90)}`));
          wc.on('did-navigate', (_e, url) => events.push(`did-navigate ${url.slice(0, 90)}`));
          wc.on('did-fail-load', (_e, code, text, url) => events.push(`did-fail-load ${code} ${text} ${String(url).slice(0, 90)}`));
          if (target) {
            wc.sendInputEvent({ type: 'mouseMove', x: target.x, y: target.y });
            wc.sendInputEvent({ type: 'mouseDown', x: target.x, y: target.y, button: 'left', clickCount: 1 });
            wc.sendInputEvent({ type: 'mouseUp', x: target.x, y: target.y, button: 'left', clickCount: 1 });
          }
          await wait(7000);
          fs.writeFileSync(`${shot}.click.json`, JSON.stringify({ target, events, url: wc.getURL().slice(0, 120) }, null, 2));
        }
        await wait(delay);
        const image = await wc.capturePage();
        fs.writeFileSync(shot, image.toPNG());
        if (logs.length) fs.writeFileSync(`${shot}.console.txt`, logs.join(String.fromCharCode(10)));
      } catch (error) {
        fs.writeFileSync(`${shot}.error.txt`, String(error && error.stack ? error.stack : error));
      }
      app.exit(0);
    });
  }
}

if (!SHOT && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    ipcMain.handle('mk:logos', () => ({
      still: dataUrl('logo.png', 'image/png'),
      animated: dataUrl('logo.gif', 'image/gif'),
    }));
    const ready = EXT
      ? (session.defaultSession.extensions || session.defaultSession).loadExtension(path.resolve(EXT)).catch((error) => {
          fs.writeFileSync(`${SHOT}.ext-error.txt`, String(error && error.stack ? error.stack : error));
        })
      : Promise.resolve();
    ready.then(() => {
      createWindow();
      if (!SHOT) createTray();
    });
  });
  app.on('window-all-closed', () => app.quit());
}
