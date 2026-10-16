# Arcane Strike: WebAR Spirit Hunter - Local Static HTTP Server
# Serves the application over HTTP/HTTPS with proper MIME types for local browser & mobile testing.

param(
    [int]$port = 8888
)

$path = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    $port = 8890
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

$localIPs = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" -ErrorAction SilentlyContinue).IPAddress

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ARCANE STRIKE: WebAR Spirit Hunter - Dev Server" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Local:   http://localhost:$port/" -ForegroundColor Green
foreach ($ip in $localIPs) {
    Write-Host "  Network: http://${ip}:${port}/ (Open on mobile device)" -ForegroundColor Green
}
Write-Host "  Press Ctrl+C to terminate the server.`n" -ForegroundColor Gray

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".wav"  = "audio/wav"
    ".mp3"  = "audio/mpeg"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $reqPath = $request.Url.LocalPath
        if ($reqPath -eq "/" -or $reqPath -eq "") {
            $reqPath = "/index.html"
        }

        $localFilePath = Join-Path $path ($reqPath.TrimStart('/').Replace('/', '\'))

        if (Test-Path $localFilePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFilePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime

            # Enable CORS and caching headers for WebAR assets
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")

            $bytes = [System.IO.File]::ReadAllBytes($localFilePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $reqPath")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
        $listener.Close()
    }
}
