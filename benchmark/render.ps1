# Renders every page in pages.json to benchmark/images/<id>.png.
# Uses System.Drawing so it needs no external tooling on Windows.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$spec = Get-Content (Join-Path $root "pages.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$outDir = Join-Path $root "images"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function New-Brush([string]$rgb) {
  $p = $rgb.Split(",")
  return New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb([int]$p[0], [int]$p[1], [int]$p[2]))
}
function New-Colour([string]$rgb) {
  $p = $rgb.Split(",")
  return [System.Drawing.Color]::FromArgb([int]$p[0], [int]$p[1], [int]$p[2])
}

foreach ($page in $spec.pages) {
  $s = $page.style
  $rowCount = $page.rows.Count
  $rowH = [int]($s.size * 3.9)
  $w = 940
  $h = 300 + ($rowCount * $rowH) + 90

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear((New-Colour $s.bg))
  $g.TextRenderingHint = 'AntiAliasGridFit'

  if ($s.rotate -ne 0) {
    $g.TranslateTransform($w / 2, $h / 2)
    $g.RotateTransform([single]$s.rotate)
    $g.TranslateTransform(-$w / 2, -$h / 2)
  }

  $ink = New-Brush $s.ink
  $grey = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(125, 130, 122))
  $hdrFont = New-Object System.Drawing.Font($s.font, 24, [System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font($s.font, 15)
  $colFont = New-Object System.Drawing.Font($s.font, 12, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font($s.font, [single]$s.size)
  $rulePen = New-Object System.Drawing.Pen((New-Colour "198,190,172"), 2)
  $thinPen = New-Object System.Drawing.Pen((New-Colour "216,209,192"), 1)

  $g.DrawString($page.header.shop, $hdrFont, $ink, 520, 34)
  $g.DrawString($page.header.sub, $subFont, $ink, 42, 92)
  if ($page.header.period) { $g.DrawString($page.header.period, $subFont, $ink, 690, 92) }
  $g.DrawLine($rulePen, 42, 136, 898, 136)

  $dateX = 55; $textX = 230; $amtX = 762
  if (-not $s.dateColumn) { $textX = 70 }

  if ($s.dateColumn) { $g.DrawString("DATE", $colFont, $grey, $dateX, 150) }
  $g.DrawString("TAFSEEL / DETAIL", $colFont, $grey, $textX, 150)
  $g.DrawString("RAQAM", $colFont, $grey, $amtX, 150)
  $g.DrawLine($rulePen, 42, 184, 898, 184)

  if ($s.twoColumn) { $g.DrawLine($thinPen, 740, 184, 740, ($h - 90)) }

  $y = 202
  $i = 0
  foreach ($row in $page.rows) {
    $day = $page.rows[$i].truth[3]
    if ($s.dateColumn -and $null -ne $day) {
      $g.DrawString(("{0} Sep 2026" -f $day), $bodyFont, $grey, $dateX, $y)
    }
    $g.DrawString($row.text, $bodyFont, $ink, $textX, $y)
    $g.DrawString($row.amount, $bodyFont, $ink, $amtX, $y)
    $g.DrawLine($thinPen, 42, ($y + $rowH - 22), 898, ($y + $rowH - 22))
    $y += $rowH
    $i += 1
  }

  $g.ResetTransform()

  if ($s.noise -gt 0) {
    $rand = New-Object System.Random(42)
    $speckle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 60, 60, 55))
    for ($n = 0; $n -lt $s.noise; $n++) {
      $g.FillRectangle($speckle, $rand.Next(0, $w), $rand.Next(140, $h - 40), 2, 2)
    }
    $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28, 60, 90, 80), 1)
    for ($ly = 200; $ly -lt ($h - 60); $ly += 34) { $g.DrawLine($linePen, 30, $ly, 910, $ly) }
  }

  $g.Dispose()
  $out = Join-Path $outDir ($page.id + ".png")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("{0,-22} {1,2} rows  {2,7} bytes" -f $page.id, $rowCount, (Get-Item $out).Length)
}

Write-Output ""
Write-Output ("Rendered {0} pages to {1}" -f $spec.pages.Count, $outDir)
