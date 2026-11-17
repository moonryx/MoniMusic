# Instala MoniMusic: ventana propia sobre Microsoft Edge (o Brave) con la extensión cargada.
# No necesita Node ni permisos de administrador. Todo queda en %LOCALAPPDATA%\MoniMusic.
$ErrorActionPreference = 'Stop'

$origen = $PSScriptRoot
$destino = Join-Path $env:LOCALAPPDATA 'MoniMusic'
$extension = Join-Path $destino 'extension'
$perfil = Join-Path $destino 'perfil'
$icono = Join-Path $destino 'icon.ico'

$candidatos = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'BraveSoftware\Brave-Browser\Application\brave.exe'),
  (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\Application\brave.exe')
)
$navegador = $candidatos | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $navegador) {
  Write-Host 'No encontré Microsoft Edge ni Brave. MoniMusic necesita uno de los dos como motor.' -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $origen 'extension\manifest.json'))) {
  Write-Host 'Falta la carpeta "extension" junto a este instalador. Descomprime el ZIP completo y vuelve a intentar.' -ForegroundColor Yellow
  exit 1
}

New-Item -ItemType Directory -Force -Path $destino, $perfil | Out-Null
if (Test-Path -LiteralPath $extension) { Remove-Item -LiteralPath $extension -Recurse -Force }
Copy-Item -LiteralPath (Join-Path $origen 'extension') -Destination $extension -Recurse
Copy-Item -LiteralPath (Join-Path $origen 'icon.ico') -Destination $icono -Force

$argumentos = '--user-data-dir="{0}" --load-extension="{1}" --no-first-run --no-default-browser-check --app=https://music.youtube.com/' -f $perfil, $extension
$shell = New-Object -ComObject WScript.Shell
foreach ($carpeta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $acceso = $shell.CreateShortcut((Join-Path $carpeta 'MoniMusic.lnk'))
  $acceso.TargetPath = $navegador
  $acceso.Arguments = $argumentos
  $acceso.WorkingDirectory = $destino
  $acceso.IconLocation = "$icono,0"
  $acceso.Description = 'MoniMusic'
  $acceso.Save()
}

Write-Host ''
Write-Host 'MoniMusic quedó instalada.' -ForegroundColor Green
Write-Host 'Ábrela con el icono "MoniMusic" del escritorio o del menú Inicio.'
Write-Host 'La primera vez, inicia sesión con tu cuenta de Google dentro de la ventana.'
