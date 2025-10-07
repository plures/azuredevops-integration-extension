# Fallback GIF creation using Windows built-in tools
# Creates an animated GIF from the captured frames

$ErrorActionPreference = "Stop"

$imagesDir = Join-Path $PSScriptRoot "..\..\images"
$framesDir = Join-Path $imagesDir "loading-frames"
$outputGif = Join-Path $imagesDir "loading-sequence.gif"

if (-not (Test-Path $framesDir)) {
    Write-Error "Frames directory not found: $framesDir"
    Write-Host "Run: npm run screenshots:loading-gif (to generate frames)"
    exit 1
}

$frames = Get-ChildItem -Path $framesDir -Filter "frame-*.png" | Sort-Object Name

if ($frames.Count -eq 0) {
    Write-Error "No frames found in $framesDir"
    exit 1
}

Write-Host "Found $($frames.Count) frames"
Write-Host ""
Write-Host "To create an animated GIF, you have several options:"
Write-Host ""
Write-Host "1. Install FFmpeg (recommended):"
Write-Host "   choco install ffmpeg"
Write-Host "   Then run: npm run screenshots:loading-gif"
Write-Host ""
Write-Host "2. Use online tool (easiest):"
Write-Host "   - Visit: https://ezgif.com/maker"
Write-Host "   - Upload frames from: $framesDir"
Write-Host "   - Set delay to 50ms (or 20fps)"
Write-Host "   - Download GIF"
Write-Host ""
Write-Host "3. Use ImageMagick:"
Write-Host "   choco install imagemagick"
Write-Host "   magick -delay 5 -loop 0 `"$framesDir\frame-*.png`" `"$outputGif`""
Write-Host ""
Write-Host "Frames are ready in:"
Write-Host $framesDir
