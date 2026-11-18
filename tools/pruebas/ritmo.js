// Prueba del fondo que reacciona a la música: pone a sonar la primera canción y mide durante 10 s
// cuánto laten las manchas, a qué ritmo se pasean y si el sonido sigue saliendo normal.
// Uso: npx electron . --shot=x.png --shot-eval=tools/pruebas/ritmo.js --shot-size=1500x900 --shot-delay=200
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const play = document.querySelector('ytmusic-responsive-list-item-renderer ytmusic-play-button-renderer');
  if (play) play.click();
  for (let i = 0; i < 50; i += 1) {
    await wait(1000);
    const v = document.querySelector('video');
    if (v && !document.querySelector('.ad-showing') && v.currentTime > 3 && v.duration > 60) break;
  }
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  const box = document.getElementById('mk-ambient');
  const media = document.querySelector('video');
  const start = media ? media.currentTime : 0;
  const pulses = [];
  const rates = [];
  let peak = 0;
  for (let i = 0; i < 100; i += 1) {
    await wait(100);
    const pulse = Number(getComputedStyle(box).getPropertyValue('--mk-pulse')) || 0;
    peak = Math.max(peak, pulse);
    if (i % 5 === 0) {
      pulses.push(pulse.toFixed(2));
      rates.push(box.dataset.mkRate);
    }
  }
  const blob = box.querySelector('.mk-b1');
  const flash = box.querySelector('.mk-flash');
  return {
    cancion: document.querySelector('ytmusic-player-bar .title')?.textContent,
    ajuste: document.documentElement.dataset.mkMotion,
    audio: box.dataset.mkAudio,
    golpesEn8s: box.dataset.mkHits,
    pulsoMaximo: peak.toFixed(2),
    pulsos: pulses.join(' '),
    ritmos: rates.join(' '),
    energia: getComputedStyle(box).getPropertyValue('--mk-energy'),
    mancha: blob ? getComputedStyle(blob).transform.slice(0, 60) : null,
    destello: flash ? getComputedStyle(flash).opacity : null,
    sonido: media ? { avanzo: (media.currentTime - start).toFixed(1), silenciado: media.muted, volumen: media.volume } : null,
  };
})();
