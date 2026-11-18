# Quita MoniMusic: los accesos directos, la carpeta %LOCALAPPDATA%\MoniMusic y los datos de la ventana
# (la sesión iniciada y los ajustes de diseño). Cierra MoniMusic antes de ejecutarlo.
$ErrorActionPreference = 'Stop'

if (Get-Process -Name 'MoniMusic' -ErrorAction SilentlyContinue) {
  Write-Host 'MoniMusic está abierta. Ciérrala y vuelve a ejecutar el desinstalador.' -ForegroundColor Yellow
  exit 1
}

foreach ($carpeta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $acceso = Join-Path $carpeta 'MoniMusic.lnk'
  if (Test-Path -LiteralPath $acceso) { Remove-Item -LiteralPath $acceso -Force }
}

# Solo se borra la carpeta si de verdad es la de MoniMusic.
$destino = Join-Path $env:LOCALAPPDATA 'MoniMusic'
$esDeMoni = (Test-Path -LiteralPath (Join-Path $destino 'app\MoniMusic.exe')) -or (Test-Path -LiteralPath (Join-Path $destino 'extension\manifest.json'))
if ($esDeMoni) { Remove-Item -LiteralPath $destino -Recurse -Force }

# Datos de la ventana: sesión de Google y ajustes de diseño.
$datos = Join-Path $env:LOCALAPPDATA 'com.moonryx.monimusic'
if (Test-Path -LiteralPath $datos) { Remove-Item -LiteralPath $datos -Recurse -Force }

Write-Host ''
Write-Host 'MoniMusic se quitó de este equipo.' -ForegroundColor Green
