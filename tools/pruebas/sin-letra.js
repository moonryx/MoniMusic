// Prueba del aviso "sin letra": pone a sonar una canción, abre la letra y arma el aviso igual que lo hace la app.
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
  for (let i = 0; i < 20; i += 1) {
    await wait(1000);
    if (document.querySelector('#mk-lyrics[data-state="synced"], #mk-lyrics[data-state="plain"], #mk-lyrics[data-state="none"]')) break;
  }
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  const box = document.getElementById('mk-lyrics');
  const scroll = box.querySelector('.mk-ly-scroll');
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const wave = make('div', 'mk-ly-wave');
  for (let i = 0; i < 18; i += 1) {
    const bar = document.createElement('i');
    bar.style.cssText = `animation-duration:${(0.62 + ((i * 7) % 5) * 0.13).toFixed(2)}s;animation-delay:-${((i * 0.37) % 1.1).toFixed(2)}s`;
    wave.appendChild(bar);
  }
  const empty = make('div', 'mk-ly-empty');
  empty.append(wave, make('p', 'mk-ly-msg', 'Esta canción no tiene letra'), make('p', 'mk-ly-hint', 'No está en el catálogo de letras. Sigue sonando igual.'));
  scroll.replaceChildren(empty);
  box.setAttribute('data-state', 'none');
  box.querySelector('.mk-ly-note').textContent = '';
  await wait(900);
  return { estado: box.getAttribute('data-state'), barras: wave.children.length };
})();
