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

// "Hillkidd y Mi Compa el Chino" -> "Hillkidd"
const firstArtist = (artist) => artist.split(/,|&|•| feat\.? | ft\.? | x | y | e | con /i)[0].trim();

// "Canción (Stonne Versión)" o "Canción - En vivo" -> "Canción": el título de la canción original
const baseTitle = (title) =>
  title
    .replace(/\s*[([][^)\]]*[)\]]/g, ' ')
    .replace(/\s+-\s+(en vivo|live|remix|versi[oó]n|version|cover|ac[uú]stic[oa]|acoustic|sped up|slowed|remaster).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim() || title;

// para comparar títulos sin tildes, mayúsculas ni signos
const plainText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// letra con tiempos -> solo el texto
const withoutStamps = (lrc) =>
  String(lrc || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]*\]/g, '').trim())
    .join('\n')
    .trim();

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
  const pack = (hit) => ({ synced: hit.syncedLyrics || null, plain: hit.plainLyrics || null, artist: hit.artistName || '' });
  const closest = (list) =>
    list.sort((a, b) => Math.abs((a.duration || 0) - length) - Math.abs((b.duration || 0) - length))[0];
  // De una lista de resultados: la que tenga tiempos y dure lo mismo; si no, solo el texto de la más parecida
  // (con otra duración los tiempos no cuadrarían).
  const pick = (hits) => {
    const synced = hits.filter((hit) => hit.syncedLyrics);
    const near = synced.filter((hit) => !length || Math.abs((hit.duration || 0) - length) <= 4);
    if (near.length) return pack(closest(near));
    const withText = hits.filter((hit) => hit.syncedLyrics || hit.plainLyrics);
    if (!withText.length) return null;
    const hit = closest(withText);
    return { synced: null, plain: hit.plainLyrics || withoutStamps(hit.syncedLyrics) || null, artist: hit.artistName || '' };
  };

  // 1) coincidencia exacta por título, artista y duración
  if (by && length) {
    try {
      const exact = await lrclib('/get', { track_name: track, artist_name: by, duration: String(Math.round(length)) });
      if (exact && exact.syncedLyrics) return pack(exact);
    } catch {
      /* se intenta la búsqueda */
    }
  }

  // 2) búsqueda por título y artista
  try {
    const query = by ? { track_name: track, artist_name: by } : { q: track };
    let hits = (await lrclib('/search', query)) || [];
    // Si con título y artista no sale nada, una búsqueda libre suele encontrarla.
    if (!hits.length && by) {
      const wanted = [plainText(track), plainText(baseTitle(track))];
      hits = ((await lrclib('/search', { q: `${track} ${by}` })) || []).filter((hit) => wanted.includes(plainText(hit.trackName)));
    }
    const found = pick(hits);
    if (found) return found;
  } catch {
    /* sin conexión o sin resultados */
  }

  // 3) versiones y covers ("Canción (Stonne Versión)", "Canción - En vivo"): se busca la canción original.
  //    Si la letra sale de la versión de otro artista, se avisa de quién es (from).
  const base = baseTitle(track);
  if (base !== track) {
    try {
      const wanted = plainText(base);
      const same = (hits) => (hits || []).filter((hit) => plainText(hit.trackName) === wanted);
      let other = false;
      let hits = by ? same(await lrclib('/search', { track_name: base, artist_name: by })) : [];
      if (!hits.length) {
        hits = same(await lrclib('/search', { track_name: base }));
        other = true;
      }
      const found = pick(hits);
      if (found) return other ? { ...found, from: found.artist } : found;
    } catch {
      /* sin conexión o sin resultados */
    }
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
