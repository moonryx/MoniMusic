// Prueba de la búsqueda de letras fuera de la app: carga el bloque de main.js con fetch normal.
// Uso: node prueba-letras.js <main.js>
const fs = require('fs');

const src = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('// ---------- letra sincronizada (LRCLIB');
const b = src.indexOf('// ---------- ventana ----------');
const code = src.slice(a, b).replace('await net.fetch(', 'await fetch(');
const findLyrics = new Function(`${code}; return findLyrics;`)();

(async () => {
  const cases = [
    { title: 'Te estoy correteando (Stonne Versión)', artist: 'Stonne', duration: 151 },
    { title: 'Acurrucar', artist: 'Ed Maverick', duration: 235 },
    { title: 'Acurrucar', artist: 'Ed Maverick', duration: 151 },
    { title: 'Zzzzqx Canción Inventada Xyz', artist: 'Nadie Existe', duration: 200 },
  ];
  for (const c of cases) {
    const r = await findLyrics(c);
    const lines = (text) => (text ? `${text.split('\n').length} líneas` : null);
    console.log(JSON.stringify(c), '=>', r ? { synced: lines(r.synced), plain: lines(r.plain), artist: r.artist, from: r.from } : null);
  }
})();
