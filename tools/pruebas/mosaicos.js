// Prueba de los mosaicos de "Selección rápida": anota cómo está armada la cuadrícula y cuánto mide cada fila.
// Uso: npx electron . --shot=x.png --shot-eval=tools/pruebas/mosaicos.js --shot-size=1500x900 --shot-delay=300
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  const row = document.querySelector('ytmusic-carousel-shelf-renderer ytmusic-responsive-list-item-renderer');
  if (!row) return { fila: null };
  const style = (node, keys) => {
    const cs = getComputedStyle(node);
    return Object.fromEntries(keys.map((key) => [key, cs[key]]));
  };
  const rect = (node) => {
    const r = node.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  };
  const chain = [];
  let node = row.parentElement;
  for (let i = 0; i < 5 && node; i += 1) {
    chain.push({
      quien: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}.${[...node.classList].slice(0, 2).join('.')}`,
      caja: rect(node),
      ...style(node, ['display', 'gridTemplateRows', 'gridAutoFlow', 'rowGap', 'columnGap', 'overflowX', 'overflowY', 'flexDirection', 'flexWrap', 'height']),
    });
    node = node.parentElement;
  }
  const rows = [...row.parentElement.children].slice(0, 6);
  return {
    fila: { caja: rect(row), ...style(row, ['boxSizing', 'height', 'minHeight', 'padding', 'margin', 'display', 'backgroundColor', 'boxShadow', 'borderRadius']) },
    primeras: rows.map((item) => rect(item)),
    miniatura: rect(row.querySelector('.left-items')),
    estiloMiniatura: style(row.querySelector('.left-items'), ['margin', 'width', 'height']),
    estante: rect(row.closest('ytmusic-carousel-shelf-renderer')),
    cadena: chain,
  };
})();
