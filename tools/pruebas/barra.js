// Prueba de la barra del reproductor: pone a sonar la primera canción y anota cómo está armada la barra.
// Uso: npx electron . --shot=x.png --shot-eval=tools/pruebas/barra.js --shot-size=1500x900 --shot-delay=300
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const play = document.querySelector('ytmusic-responsive-list-item-renderer ytmusic-play-button-renderer');
  if (play) play.click();
  for (let i = 0; i < 50; i += 1) {
    await wait(1000);
    const v = document.querySelector('video');
    if (v && !document.querySelector('.ad-showing') && v.currentTime > 2 && v.duration > 60) break;
  }
  document.querySelector('ytmusic-mealbar-promo-renderer, tp-yt-paper-toast')?.remove();
  await wait(1500);

  const box = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    return {
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      pos: cs.position, z: cs.zIndex, display: cs.display, bg: cs.backgroundColor.slice(0, 28),
    };
  };
  const pick = (selector) => box(document.querySelector(selector));
  const tree = (node, depth) => {
    if (!node || depth < 0) return null;
    const kids = [...node.children].slice(0, 14).map((child) => tree(child, depth - 1)).filter(Boolean);
    const label = `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.classList.length ? `.${[...node.classList].slice(0, 4).join('.')}` : ''}`;
    return kids.length ? { [label]: kids } : label;
  };
  const bar = document.querySelector('ytmusic-player-bar');
  const slider = document.querySelector('#progress-bar');
  const layout = document.querySelector('ytmusic-app-layout');
  return {
    ventana: [window.innerWidth, window.innerHeight],
    barra: pick('ytmusic-player-bar'),
    estiloBarra: bar ? { style: bar.getAttribute('style'), width: getComputedStyle(bar).width, left: getComputedStyle(bar).left, right: getComputedStyle(bar).right, bottom: getComputedStyle(bar).bottom } : null,
    pista: pick('#progress-bar #sliderBar'),
    perilla: pick('#progress-bar #sliderKnob'),
    iconoPlay: (() => { const p = document.querySelector('ytmusic-player-bar #play-pause-button path, ytmusic-player-bar #play-pause-button svg'); return p ? getComputedStyle(p).fill : null; })(),
    disco: (() => { const t = document.querySelector('ytmusic-player-bar .thumbnail-image-wrapper'); return t ? { anim: getComputedStyle(t).animationName, estado: getComputedStyle(t).animationPlayState, radio: getComputedStyle(t).borderRadius } : null; })(),
    barraDesplazamiento: window.innerWidth - document.documentElement.clientWidth,
    mini: pick('ytmusic-miniplayer'),
    fondo: pick('#player-bar-background'),
    altoVar: layout ? getComputedStyle(layout).getPropertyValue('--ytmusic-player-bar-height') : null,
    progreso: pick('#progress-bar'),
    sombraProgreso: slider ? Boolean(slider.shadowRoot) : null,
    partesProgreso: slider ? tree(slider, 4) : null,
    izquierda: pick('ytmusic-player-bar .left-controls'),
    centro: pick('ytmusic-player-bar .middle-controls'),
    derecha: pick('ytmusic-player-bar .right-controls'),
    play: pick('ytmusic-player-bar #play-pause-button'),
    anterior: pick('ytmusic-player-bar .previous-button'),
    siguiente: pick('ytmusic-player-bar .next-button'),
    tiempo: pick('ytmusic-player-bar .time-info'),
    miniatura: pick('ytmusic-player-bar .thumbnail-image-wrapper'),
    imagen: pick('ytmusic-player-bar .thumbnail-image-wrapper img'),
    info: pick('ytmusic-player-bar .content-info-wrapper'),
    titulo: pick('ytmusic-player-bar .content-info-wrapper .title'),
    autor: pick('ytmusic-player-bar .content-info-wrapper .byline'),
    arbol: bar ? tree(bar, 3) : null,
  };
})();
