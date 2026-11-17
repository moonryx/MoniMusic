// Genera los iconos de la app a partir de assets/logo-source.png (imagen cuadrada del monito).
//   assets/logo.png  -> logo cuadrado para usar dentro de la app
//   assets/icon.png  -> icono con esquinas redondeadas (ventana y bandeja)
//   assets/icon.ico  -> icono de Windows con varios tamaños
// Uso: npm run icon
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ASSETS = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'logo-source.png');
const SIZES = [256, 128, 64, 48, 32, 24, 16];

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  images.forEach(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

app.whenReady().then(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Falta ${SOURCE}`);
    app.exit(1);
    return;
  }

  // Logo cuadrado para la interfaz.
  const square = nativeImage.createFromPath(SOURCE).resize({ width: 320, height: 320, quality: 'best' });
  fs.writeFileSync(path.join(ASSETS, 'logo.png'), square.toPNG());

  // Icono con esquinas redondeadas: se dibuja en una ventana invisible para recortar con transparencia.
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });
  let frame = null;
  win.webContents.on('paint', (_event, _dirty, image) => {
    frame = image;
  });
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">
    <img src="${pathToFileURL(SOURCE)}" style="display:block;width:480px;height:480px;margin:16px;border-radius:112px;object-fit:cover">
  </body></html>`;
  const page = path.join(app.getPath('temp'), 'monimusic-icon.html');
  fs.writeFileSync(page, html);
  await win.loadFile(page);
  win.webContents.invalidate();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (!frame) {
    console.error('No se pudo dibujar el icono.');
    app.exit(1);
    return;
  }

  const rounded = frame.resize({ width: 512, height: 512, quality: 'best' });
  fs.writeFileSync(path.join(ASSETS, 'icon.png'), rounded.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
  fs.writeFileSync(
    path.join(ASSETS, 'icon.ico'),
    ico(SIZES.map((size) => ({ size, png: rounded.resize({ width: size, height: size, quality: 'best' }).toPNG() }))),
  );
  app.exit(0);
});
