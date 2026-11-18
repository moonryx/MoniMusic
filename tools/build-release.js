// Arma las descargas de una versión en dist/:
//   MoniMusic-<versión>-windows.zip    la app (MoniMusic.exe) con su instalador, que no necesita Node
//   MoniMusic-<versión>-extension.zip  la extensión para Chrome, Edge, Brave y Opera
//   MoniMusic-windows.zip              la misma app con nombre fijo, para el botón de la página
// El .exe sale de GitHub Actions (artefacto "MoniMusic-windows"); se le indica dónde está:
// Uso: npm run release -- --exe=ruta\a\monimusic.exe
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dist = path.join(root, 'dist');

const exeArg = process.argv.find((arg) => arg.startsWith('--exe='));
const exe = exeArg ? path.resolve(exeArg.slice('--exe='.length)) : path.join(dist, 'MoniMusic.exe');
if (!fs.existsSync(exe)) {
  console.error(`No encuentro el ejecutable: ${exe}\nBájalo de GitHub Actions y pásalo con --exe=ruta`);
  process.exit(1);
}

const zipFolder = (folder, zip) => {
  fs.rmSync(zip, { force: true });
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `Compress-Archive -Path '${folder}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`],
    { stdio: 'inherit' },
  );
  console.log(`Listo: ${zip} (${Math.round(fs.statSync(zip).size / 1024)} KB)`);
};

// ---------- la app ----------
const name = `MoniMusic-${version}-windows`;
const stage = path.join(dist, name);
const files = path.join(stage, 'archivos');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(files, { recursive: true });
fs.copyFileSync(exe, path.join(files, 'MoniMusic.exe'));

// Windows PowerShell 5 lee los .ps1 sin marca como ANSI: se guardan con BOM para que las tildes salgan bien.
for (const script of ['instalar.ps1', 'desinstalar.ps1']) {
  const text = fs.readFileSync(path.join(root, 'instalador', script), 'utf8').replace(/^﻿/, '');
  fs.writeFileSync(path.join(files, script), `﻿${text}`, 'utf8');
}

const launcher = (script) =>
  ['@echo off', 'title MoniMusic', `powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0archivos\\${script}"`, 'echo.', 'pause', ''].join('\r\n');
fs.writeFileSync(path.join(stage, 'Instalar MoniMusic.cmd'), launcher('instalar.ps1'));
fs.writeFileSync(path.join(stage, 'Desinstalar MoniMusic.cmd'), launcher('desinstalar.ps1'));

fs.writeFileSync(
  path.join(stage, 'LEEME.txt'),
  [
    `MoniMusic ${version}`,
    'YouTube Music, con tu estilo.',
    '',
    'INSTALAR',
    '1. Descomprime esta carpeta completa.',
    '2. Doble clic en "Instalar MoniMusic.cmd".',
    '3. Abre MoniMusic desde el escritorio o el menu Inicio e inicia sesion con Google una vez.',
    '',
    'Funciona en Windows 10 y 11. Usa el motor WebView2 de Microsoft, que ya viene con Windows 11',
    'y con Microsoft Edge en Windows 10.',
    '',
    'MoniMusic no esta firmada. Si Windows muestra un aviso, elige "Mas informacion" y',
    '"Ejecutar de todas formas". Con el Control de aplicaciones inteligente activado,',
    'Windows puede no dejarla abrir. Lo que hace el instalador esta en archivos\\instalar.ps1.',
    '',
    'QUITAR',
    'Cierra MoniMusic y haz doble clic en "Desinstalar MoniMusic.cmd".',
    '',
    'MoniMusic es un proyecto independiente de Moonryx. No esta afiliado a YouTube ni a Google.',
    'https://monim.moonryx.com',
    '',
  ].join('\r\n'),
);
zipFolder(stage, path.join(dist, `${name}.zip`));
// copia con nombre fijo: la página enlaza a releases/latest/download/MoniMusic-windows.zip
fs.copyFileSync(path.join(dist, `${name}.zip`), path.join(dist, 'MoniMusic-windows.zip'));

// ---------- la extensión ----------
execFileSync(process.execPath, [path.join(__dirname, 'build-extension.js')], { stdio: 'inherit' });
zipFolder(path.join(root, 'extension'), path.join(dist, `MoniMusic-${version}-extension.zip`));
