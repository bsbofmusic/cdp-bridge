Add-Type -AssemblyName System.Drawing

$assetDir = 'D:\CODE\cdp-bridge\electron\assets'
if (!(Test-Path $assetDir)) {
  New-Item -ItemType Directory -Path $assetDir | Out-Null
}

$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = 'HighQuality'
$graphics.Clear([System.Drawing.Color]::FromArgb(11, 18, 32))

$gradientBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 0, 0, 256, 256),
  [System.Drawing.Color]::FromArgb(37, 99, 235),
  [System.Drawing.Color]::FromArgb(14, 165, 233),
  45
)
$graphics.FillEllipse($gradientBrush, 18, 18, 220, 220)

$innerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$graphics.FillEllipse($innerBrush, 84, 84, 88, 88)

$font = New-Object System.Drawing.Font('Segoe UI', 62, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString('C', $font, $textBrush, 78, 86)

$pngPath = Join-Path $assetDir 'app-icon.png'
$icoPath = Join-Path $assetDir 'app-icon.ico'

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create($icoPath)
$icon.Save($stream)
$stream.Close()

$graphics.Dispose()
$bitmap.Dispose()
