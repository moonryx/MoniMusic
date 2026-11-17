// Arma la descarga para Windows: dist/MoniMusic-<versión>-windows.zip
// Contiene la extensión, el icono y un instalador que no necesita Node.
// Uso: npm run release
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const name = `MoniMusic-${version}-windows`;
const dist = path.join(root, 'dist');
const stage = path.join(dist, name);
const files = path.join(stage, 'archivos');

execFileSync(process.execPath, [path.join(__dirname, 'build-extension.js')], { stdio: 'inherit' });

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(files, { recursive: true });
fs.cpSync(path.join(root, 'extension'), path.join(files, 'extension'), { recursive: true });
fs.copyFileSync(path.join(root, 'assets', 'icon.ico'), path.join(files, 'icon.ico'));

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
    'Necesita Windows 10 u 11 con Microsoft Edge (viene con Windows) o Brave.',
    'Si Windows muestra un aviso al abrir el instalador, elige "Mas informacion" y "Ejecutar de todas formas":',
    'el instalador no esta firmado. Puedes leer lo que hace en archivos\\instalar.ps1.',
    '',
    'QUITAR',
    'Cierra MoniMusic y haz doble clic en "Desinstalar MoniMusic.cmd".',
    '',
    'MoniMusic es un proyecto independiente de Moonryx. No esta afiliado a YouTube ni a Google.',
    'https://monim.moonryx.com',
    '',
  ].join('\r\n'),
);

const zip = path.join(dist, `${name}.zip`);
fs.rmSync(zip, { force: true });
execFileSync(
  'powershell.exe',
  ['-NoProfile', '-NonInteractive', '-Command', `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`],
  { stdio: 'inherit' },
);
console.log(`Descarga lista: ${zip} (${Math.round(fs.statSync(zip).size / 1024)} KB)`);
