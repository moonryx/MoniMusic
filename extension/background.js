// MoniMusic (extensión) — busca la letra con tiempos en LRCLIB cuando la página la pide.
// Generado por tools/build-extension.js a partir de main.js.

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
  const response = await fetch(`${LRCLIB}${pathname}?${new URLSearchParams(params)}`, {
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


chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (!message || message.type !== 'lyrics') return false;
  findLyrics(message.info || {})
    .then(respond)
    .catch(() => respond(null));
  return true; // la respuesta llega después
});
