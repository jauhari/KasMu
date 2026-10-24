Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $g.Clear([System.Drawing.Color]::Transparent)

  # rrect bg #0b0b0f
  $radius = [int]($size * 0.1875)
  $pathObj = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = $radius
  $pathObj.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
  $pathObj.AddArc($size - $r * 2, 0, $r * 2, $r * 2, 270, 90)
  $pathObj.AddArc($size - $r * 2, $size - $r * 2, $r * 2, $r * 2, 0, 90)
  $pathObj.AddArc(0, $size - $r * 2, $r * 2, $r * 2, 90, 90)
  $pathObj.CloseFigure()

  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 11, 15))
  $g.FillPath($bg, $pathObj)
  $bg.Dispose()

  # garis border tipis #23232a
  $penW = [Math]::Max(2, [int]($size * 0.012))
  $border = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 35, 35, 42), $penW)
  $bPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $b2 = $r - $penW
  if ($b2 -gt 0) {
    $bPath.AddArc($penW, $penW, $b2 * 2, $b2 * 2, 180, 90)
    $bPath.AddArc($size - $penW - $b2 * 2, $penW, $b2 * 2, $b2 * 2, 270, 90)
    $bPath.AddArc($size - $penW - $b2 * 2, $size - $penW - $b2 * 2, $b2 * 2, $b2 * 2, 0, 90)
    $bPath.AddArc($penW, $size - $penW - $b2 * 2, $b2 * 2, $b2 * 2, 90, 90)
    $bPath.CloseFigure()
    $g.DrawPath($border, $bPath)
  }
  $border.Dispose()
  $bPath.Dispose()

  # teks KM putih (Consolas bold)
  $fontSize = [Math]::Round($size * 0.42)
  $font = New-Object System.Drawing.Font("Consolas", $fontSize, [System.Drawing.FontStyle]::Bold)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  $textRect = New-Object System.Drawing.RectangleF(0, $size * 0.03, $size * 0.82, $size - $size * 0.06)
  $g.DrawString("KM", $font, $white, $textRect, $fmt)

  # ukur posisi kanan teks utk kursor amber
  $measured = $g.MeasureString("KM", $font, [int]$textRect.Width, $fmt)
  $cursorW = [Math]::Max(3, [int]($size * 0.066))
  $cursorH = [int]($fontSize * 0.55)
  $cx = [int](($size * 0.82 - $measured.Width) / 2 + $measured.Width + $size * 0.04)
  $cy = [int]($size * 0.5 - $cursorH * 0.25)
  $amber = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
  $cursorRect = New-Object System.Drawing.Rectangle($cx, $cy, $cursorW, $cursorH)
  $g.FillRectangle($amber, $cursorRect)

  $amber.Dispose(); $white.Dispose(); $font.Dispose(); $fmt.Dispose(); $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "OK $path"
}

New-Icon 512 "src\app\icon.png"
New-Icon 180 "src\app\apple-icon.png"
