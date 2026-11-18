// Prueba de la pantalla de inicio: anota cómo está armada (estantes, tarjetas, filtros) y deja la página arriba.
// Uso: npx electron . --shot=x.png --shot-eval=tools/pruebas/inicio.js --shot-size=1500x900 --shot-delay=300
// Con MK_SCROLL en la dirección (#baja) baja un poco para ver más estantes.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  const box = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, bg: cs.backgroundColor.slice(0, 26), radio: cs.borderRadius };
  };
  const pick = (selector) => box(document.querySelector(selector));
  const count = (selector) => document.querySelectorAll(selector).length;
  const tree = (node, depth) => {
    if (!node || depth < 0) return null;
    const kids = [...node.children].slice(0, 8).map((child) => tree(child, depth - 1)).filter(Boolean);
    const label = `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.classList.length ? `.${[...node.classList].slice(0, 3).join('.')}` : ''}`;
    return kids.length ? { [label]: kids } : label;
  };
  const shelves = [...document.querySelectorAll('ytmusic-section-list-renderer > #contents > *')].slice(0, 8).map((node) => {
    const title = node.querySelector('.title, h2');
    return `${node.tagName.toLowerCase()} · ${title ? title.textContent.trim().slice(0, 40) : ''} · ${Math.round(node.getBoundingClientRect().height)}px`;
  });
  const card = document.querySelector('ytmusic-two-row-item-renderer');
  const row = document.querySelector('ytmusic-responsive-list-item-renderer');
  const header = document.querySelector('ytmusic-carousel-shelf-basic-header-renderer');
  const result = {
    ventana: [window.innerWidth, window.innerHeight],
    estantes: shelves,
    cuantos: {
      carruseles: count('ytmusic-carousel-shelf-renderer'),
      tarjetas: count('ytmusic-two-row-item-renderer'),
      filas: count('ytmusic-responsive-list-item-renderer'),
      filtros: count('ytmusic-chip-cloud-chip-renderer'),
      inmersivo: count('ytmusic-immersive-header-renderer, ytmusic-visual-header-renderer'),
    },
    filtros: pick('ytmusic-chip-cloud-renderer'),
    filtro: pick('ytmusic-chip-cloud-chip-renderer'),
    arbolFiltro: tree(document.querySelector('ytmusic-chip-cloud-chip-renderer'), 3),
    encabezado: box(header),
    arbolEncabezado: tree(header, 4),
    tituloEstante: pick('ytmusic-carousel-shelf-basic-header-renderer .title'),
    tarjeta: box(card),
    arbolTarjeta: tree(card, 4),
    imagenTarjeta: pick('ytmusic-two-row-item-renderer .image, ytmusic-two-row-item-renderer #thumbnail'),
    fila: box(row),
    arbolFila: tree(row, 3),
    flechas: pick('ytmusic-carousel-shelf-renderer .next-items-button, ytmusic-carousel-shelf-renderer #next-items-button'),
    contenido: pick('ytmusic-browse-response #contents, ytmusic-section-list-renderer'),
  };
  if (location.hash === '#baja') {
    window.scrollTo(0, 620);
    document.querySelectorAll('ytmusic-app-layout, #layout, #contentContainer, ytmusic-browse-response').forEach((node) => { node.scrollTop = 620; });
    await wait(1800);
  }
  return result;
})();
