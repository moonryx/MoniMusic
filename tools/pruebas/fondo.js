// Prueba del fondo en movimiento: revisa las manchas de color, el ajuste del panel y que apagarlo las detenga.
// Uso: npx electron . --shot=x.png --shot-eval=tools/pruebas/fondo.js --shot-size=1500x900 --shot-delay=300
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  const root = document.documentElement;
  const blobs = [...document.querySelectorAll('#mk-ambient .mk-blob')];
  const look = () => blobs.map((blob) => {
    const cs = getComputedStyle(blob);
    return { anim: cs.animationName, opacidad: cs.opacity, fondo: cs.backgroundImage.slice(0, 60), mueve: cs.transform.slice(0, 44) };
  });
  const encendido = { ajuste: root.dataset.mkMotion, manchas: look() };

  // se abre el panel y se apaga el movimiento con el botón "Quieto"
  document.getElementById('mk-fab')?.click();
  await wait(700);
  const buttons = [...document.querySelectorAll('#mk-panel .mk-seg button')];
  const still = buttons.find((button) => button.textContent.trim() === 'Quieto');
  const moving = buttons.find((button) => button.textContent.trim() === 'En movimiento');
  if (still) still.click();
  await wait(1800);
  const apagado = { ajuste: root.dataset.mkMotion, manchas: look(), guardado: JSON.parse(localStorage.getItem('monky-settings-v1') || '{}').motion };
  if (moving) moving.click();
  await wait(1800);
  document.querySelector('#mk-panel .mk-close')?.click();
  await wait(600);
  return { botones: Boolean(still && moving), encendido, apagado, alFinal: root.dataset.mkMotion };
})();
