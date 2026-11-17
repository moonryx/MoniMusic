# Quita MoniMusic: los accesos directos y la carpeta %LOCALAPPDATA%\MoniMusic
# (incluye la sesión iniciada y los ajustes de diseño). Cierra MoniMusic antes de ejecutarlo.
$ErrorActionPreference = 'Stop'

$destino = Join-Path $env:LOCALAPPDATA 'MoniMusic'
foreach ($carpeta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $acceso = Join-Path $carpeta 'MoniMusic.lnk'
  if (Test-Path -LiteralPath $acceso) { Remove-Item -LiteralPath $acceso -Force }
}
if (Test-Path -LiteralPath (Join-Path $destino 'extension\manifest.json')) {
  Remove-Item -LiteralPath $destino -Recurse -Force
}

Write-Host ''
Write-Host 'MoniMusic se quitó de este equipo.' -ForegroundColor Green
