// Instala MoniMusic como app de escritorio sobre el motor de un navegador real (Edge o Brave):
// ventana propia sin pestañas, perfil propio y la extensión de MoniMusic cargada sola.
// Así el inicio de sesión de Google funciona (lo rechaza en apps con navegador incrustado).
//
//   %LOCALAPPDATA%\MoniMusic\extension  -> copia de la extensión
//   %LOCALAPPDATA%\MoniMusic\perfil     -> sesión y ajustes de la app (no se toca al reinstalar)
//   Accesos directos "MoniMusic" en el escritorio y el menú Inicio
//
// Uso: npm run instalar   (con MoniMusic cerrada)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const home = path.join(process.env.LOCALAPPDATA, 'MoniMusic');
const extension = path.join(home, 'extension');
const profile = path.join(home, 'perfil');
const icon = path.join(home, 'icon.ico');

const browsers = [
  path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
];
const browser = browsers.find((candidate) => fs.existsSync(candidate));
if (!browser) {
  console.error('No encontré Edge ni Brave para usar como motor.');
  process.exit(1);
}

// 1) extensión recién generada
execFileSync(process.execPath, [path.join(__dirname, 'build-extension.js')], { stdio: 'inherit' });
fs.rmSync(extension, { recursive: true, force: true });
fs.cpSync(path.join(root, 'extension'), extension, { recursive: true });
fs.mkdirSync(profile, { recursive: true });
fs.copyFileSync(path.join(root, 'assets', 'icon.ico'), icon);

// 2) accesos directos
const args = [
  `--user-data-dir="${profile}"`,
  `--load-extension="${extension}"`,
  '--no-first-run',
  '--no-default-browser-check',
  '--app=https://music.youtube.com/',
].join(' ');
const quote = (text) => `'${text.replace(/'/g, "''")}'`;
const script = `
$ws = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $s = $ws.CreateShortcut((Join-Path $dir 'MoniMusic.lnk'))
  $s.TargetPath = ${quote(browser)}
  $s.Arguments = ${quote(args)}
  $s.WorkingDirectory = ${quote(home)}
  $s.IconLocation = ${quote(`${icon},0`)}
  $s.Description = 'MoniMusic'
  $s.Save()
}`;
execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'inherit' });

console.log(`MoniMusic instalada. Motor: ${browser}`);
console.log(`Perfil: ${profile}`);
