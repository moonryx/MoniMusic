// Prueba de la vista de letra: pone a sonar la primera canción, abre la letra y anota cómo quedó.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const play = document.querySelector('ytmusic-responsive-list-item-renderer ytmusic-play-button-renderer');
  if (play) play.click();
  for (let i = 0; i < 50; i += 1) {
    await wait(1000);
    const v = document.querySelector('video');
    if (v && !document.querySelector('.ad-showing') && v.currentTime > 2 && v.duration > 60) break;
  }
  const btn = document.getElementById('mk-lyrics-btn');
  if (btn) btn.click();
  // se espera a que haya una línea sonando y un poco más, para verla a medio llenar
  for (let i = 0; i < 60; i += 1) {
    await wait(1000);
    if (document.querySelector('.mk-line.mk-active')) break;
  }
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  await wait(1200);
  const bg = document.querySelector('.mk-ly-bg img');
  const bar = document.querySelector('#progress-bar');
  const box = document.getElementById('mk-lyrics');
  const videos = [...document.querySelectorAll('video')].map((v) => ({ dur: Math.round(v.duration), t: Math.round(v.currentTime), paused: v.paused }));
  return {
    estado: box && box.getAttribute('data-state'),
    cancion: document.querySelector('.mk-ly-title')?.textContent,
    nota: document.querySelector('.mk-ly-note')?.textContent,
    lineas: document.querySelectorAll('.mk-line').length,
    activa: document.querySelector('.mk-line.mk-active')?.textContent,
    relleno: document.querySelector('.mk-line.mk-active')?.style.getPropertyValue('--mk-fill'),
    videos,
    barra: bar ? { max: bar.getAttribute('aria-valuemax'), now: bar.getAttribute('aria-valuenow'), tag: bar.tagName } : null,
    barras: document.querySelectorAll('#progress-bar').length,
    sonando: document.documentElement.hasAttribute('data-mk-playing'),
    fondo: bg ? { src: (bg.getAttribute('src') || '').slice(0, 40), ancho: bg.naturalWidth } : null,
  };
})();
