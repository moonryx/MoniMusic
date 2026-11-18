// Prueba de las tarjetas del inicio: baja hasta el primer estante de tarjetas (álbumes, listas) y lo deja centrado.
// Uso: npx electron . --shot=x.png --shot-eval=tools/pruebas/inicio-tarjetas.js --shot-size=1500x900 --shot-delay=300
//      --shot-hover="ytmusic-two-row-item-renderer:nth-of-type(2)"   (para ver el efecto al pasar el mouse)
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  const card = document.querySelector('ytmusic-two-row-item-renderer');
  if (card) card.scrollIntoView({ block: 'center' });
  await wait(2500);
  const shelf = card ? card.closest('ytmusic-carousel-shelf-renderer') : null;
  const box = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    desplazado: Math.round(window.scrollY),
    tarjeta: box(card),
    estante: box(shelf),
    opacidadEstante: shelf ? getComputedStyle(shelf).opacity : null,
    animacion: shelf ? getComputedStyle(shelf).animationName : null,
    lineaDeTiempo: shelf ? getComputedStyle(shelf).animationTimeline : null,
    fila: box(document.querySelector('ytmusic-carousel-shelf-renderer ytmusic-responsive-list-item-renderer')),
  };
})();
