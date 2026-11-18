# Instala MoniMusic: copia la app a %LOCALAPPDATA%\MoniMusic\app y crea los accesos directos
# en el escritorio y en el menú Inicio. No necesita permisos de administrador.
$ErrorActionPreference = 'Stop'

$origen = $PSScriptRoot
$destino = Join-Path $env:LOCALAPPDATA 'MoniMusic'
$carpetaApp = Join-Path $destino 'app'
$exe = Join-Path $carpetaApp 'MoniMusic.exe'
$nuevo = Join-Path $origen 'MoniMusic.exe'

if (-not (Test-Path -LiteralPath $nuevo)) {
  Write-Host 'Falta MoniMusic.exe junto a este instalador. Descomprime el ZIP completo y vuelve a intentar.' -ForegroundColor Yellow
  exit 1
}
if (Get-Process -Name 'MoniMusic' -ErrorAction SilentlyContinue) {
  Write-Host 'MoniMusic está abierta. Ciérrala y vuelve a ejecutar el instalador.' -ForegroundColor Yellow
  exit 1
}

# MoniMusic usa el motor WebView2 de Windows (viene con Windows 11 y con Edge en Windows 10).
$webview2 = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$hayMotor = @(
  "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$webview2",
  "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$webview2",
  "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$webview2"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $hayMotor) {
  Write-Host 'Aviso: no encontré el motor WebView2 de Microsoft. Si MoniMusic no abre, instálalo desde:' -ForegroundColor Yellow
  Write-Host '  https://developer.microsoft.com/microsoft-edge/webview2/'
}

New-Item -ItemType Directory -Force -Path $carpetaApp | Out-Null
Copy-Item -LiteralPath $nuevo -Destination $exe -Force
# una interfaz suelta de una versión anterior ya no hace falta: la app trae la suya
$suelto = Join-Path $carpetaApp 'inject.js'
if (Test-Path -LiteralPath $suelto) { Remove-Item -LiteralPath $suelto -Force }
# restos de la versión anterior, que funcionaba como extensión sobre Edge
foreach ($viejo in @((Join-Path $destino 'extension'), (Join-Path $destino 'icon.ico'))) {
  if (Test-Path -LiteralPath $viejo) { Remove-Item -LiteralPath $viejo -Recurse -Force }
}

$shell = New-Object -ComObject WScript.Shell
foreach ($carpeta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $acceso = $shell.CreateShortcut((Join-Path $carpeta 'MoniMusic.lnk'))
  $acceso.TargetPath = $exe
  $acceso.Arguments = ''
  $acceso.WorkingDirectory = $carpetaApp
  $acceso.IconLocation = "$exe,0"
  $acceso.Description = 'MoniMusic'
  $acceso.Save()
}

Write-Host ''
Write-Host 'MoniMusic quedó instalada.' -ForegroundColor Green
Write-Host 'Ábrela con el icono "MoniMusic" del escritorio o del menú Inicio.'
Write-Host 'La primera vez, inicia sesión con tu cuenta de Google dentro de la ventana.'
