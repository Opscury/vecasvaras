# Turns an etching on white paper into one ink colour with alpha from darkness,
# the way the codex vignettes are prepared (ART_NOTES.md), with an oval feather.
# Usage: powershell -File tools\ink_vignette.ps1 <in.jpg> <out.png> [size]
param([string]$In, [string]$Out, [int]$Size = 512)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($src, 0, 0, $Size, $Size)
$g.Dispose(); $src.Dispose()
# Ink #48301a
$ir = 0x48; $ig = 0x30; $ib = 0x1a
$rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
$data = $bmp.LockBits($rect, 'ReadWrite', $bmp.PixelFormat)
$n = $data.Stride * $Size
$px = New-Object byte[] $n
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $px, 0, $n)
$c = $Size / 2.0
for ($y = 0; $y -lt $Size; $y++) {
  for ($x = 0; $x -lt $Size; $x++) {
    $i = $y * $data.Stride + $x * 4
    $lum = (0.299 * $px[$i + 2] + 0.587 * $px[$i + 1] + 0.114 * $px[$i]) / 255.0
    $a = [Math]::Min(1.0, [Math]::Max(0.0, (0.92 - $lum) / 0.72))
    $dx = ($x - $c) / ($c * 0.98); $dy = ($y - $c) / ($c * 0.98)
    $r = [Math]::Sqrt($dx * $dx + $dy * $dy)
    $f = [Math]::Min(1.0, [Math]::Max(0.0, (1.0 - $r) / 0.18))
    $px[$i] = $ib; $px[$i + 1] = $ig; $px[$i + 2] = $ir
    $px[$i + 3] = [byte]([Math]::Round(255 * $a * $f))
  }
}
[System.Runtime.InteropServices.Marshal]::Copy($px, 0, $data.Scan0, $n)
$bmp.UnlockBits($data)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"wrote $Out"
