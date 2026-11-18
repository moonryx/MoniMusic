// Captura para la página de MoniMusic: elige un tema en el panel, pone a sonar una canción y vuelve al inicio,
// así se ven el tema, los mosaicos y la barra del reproductor juntos.
// El tema se elige con una línea antes del guion (YouTube borra lo que va después de # en la dirección):
//   echo "const MK_TEMA = 'neon';" | cat - tools/pruebas/captura-web.js > tema.js     (aurora, neon, atardecer)
// Uso: npx electron . --shot=neon.png --shot-eval=tema.js --shot-size=1300x820 --shot-delay=2500
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAMES = { aurora: 'Aurora', neon: 'Neón', atardecer: 'Atardecer' };
  const want = typeof MK_TEMA === 'string' ? MK_TEMA : 'aurora';
  await wait(2500);

  // tema desde el panel, como lo haría la persona
  document.getElementById('mk-fab')?.click();
  await wait(700);
  const preset = [...document.querySelectorAll('#mk-panel button')].find((button) =>
    button.textContent.trim().startsWith(NAMES[want] || want),
  );
  preset?.click();
  await wait(500);
  // Aurora toma el color de la portada; para la página se muestra con su degradado morado de siempre
  if (want === 'aurora') {
    [...document.querySelectorAll('#mk-panel .mk-seg button')].find((button) => button.textContent.trim() === 'Degradado')?.click();
    await wait(400);
  }
  document.querySelector('#mk-panel .mk-close')?.click();
  await wait(500);

  // una canción sonando (para que la barra del reproductor esté completa) y de vuelta al inicio
  const play = document.querySelector('ytmusic-responsive-list-item-renderer ytmusic-play-button-renderer');
  play?.click();
  for (let i = 0; i < 50; i += 1) {
    await wait(1000);
    const v = document.querySelector('video');
    if (v && !document.querySelector('.ad-showing') && v.currentTime > 2 && v.duration > 60) break;
  }
  const layout = document.querySelector('ytmusic-app-layout');
  if (layout && layout.hasAttribute('player-page-open')) {
    document.querySelector('ytmusic-player-bar .toggle-player-page-button')?.click();
    await wait(1500);
  }
  window.scrollTo(0, 0);
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  // el video en miniatura que YouTube Music deja en la esquina tapa el inicio: solo para la foto se esconde
  const corner = document.elementFromPoint(window.innerWidth - 120, window.innerHeight - 190);
  const mini = corner ? corner.closest('ytmusic-player, #player') : null;
  if (mini) mini.style.visibility = 'hidden';
  await wait(400);
  return {
    tema: want,
    elegido: Boolean(preset),
    cancion: document.querySelector('ytmusic-player-bar .title')?.textContent,
    paginaReproductor: layout ? layout.hasAttribute('player-page-open') : null,
    anuncio: Boolean(document.querySelector('.ad-showing')),
  };
})();
