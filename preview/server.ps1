$port = 8085
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "ALTRIXWEAR V2 Preview Server listening on http://localhost:$port/"

$root = (Get-Item -Path ".").FullName

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "/") {
            $rawPath = "preview/index.html"
        }

        if ($rawPath -like "api/*") {
            $apiResp = @{
                status = "active"
                serviceAccount = "firebase-adminsdk-fbsvc@altrixwear-dd612.iam.gserviceaccount.com"
                projectId = "altrixwear-dd612"
                timestamp = (Get-Date).ToString("o")
            }
            $json = ConvertTo-Json $apiResp
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        $filePath = Join-Path $root $rawPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)

        if (-not (Test-Path $filePath -PathType Leaf)) {
            $routeMap = @{
                "shop" = "preview/collection.html"
                "collection" = "preview/collection.html"
                "collections" = "preview/collection.html"
                "product" = "preview/product.html"
                "products" = "preview/collection.html"
                "cart" = "preview/cart.html"
                "bag" = "preview/cart.html"
                "about" = "preview/about.html"
                "contact" = "preview/contact.html"
                "account" = "preview/account.html"
                "orders" = "preview/account.html"
                "shapewear" = "preview/shapewear.html"
                "shipping" = "preview/shipping.html"
                "returns" = "preview/returns.html"
                "privacy" = "preview/privacy.html"
                "terms" = "preview/terms.html"
            }

            $cleanKey = $rawPath.ToLower().TrimEnd('/')
            if ($routeMap.ContainsKey($cleanKey)) {
                $filePath = Join-Path $root ($routeMap[$cleanKey].Replace('/', '\'))
            } elseif (Test-Path (Join-Path $root ("preview\" + $rawPath.Replace('/', '\'))) -PathType Leaf) {
                $filePath = Join-Path $root ("preview\" + $rawPath.Replace('/', '\'))
            } elseif (Test-Path (Join-Path $root ("preview\" + $rawPath.Replace('/', '\') + ".html")) -PathType Leaf) {
                $filePath = Join-Path $root ("preview\" + $rawPath.Replace('/', '\') + ".html")
            } elseif (Test-Path (Join-Path $root ("assets\" + $rawPath.Replace('/', '\'))) -PathType Leaf) {
                $filePath = Join-Path $root ("assets\" + $rawPath.Replace('/', '\'))
            }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                ".webmanifest" { "application/manifest+json" }
                ".webp" { "image/webp" }
                ".woff2" { "font/woff2" }
                ".woff" { "font/woff" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $contentType
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.AddHeader("Pragma", "no-cache")
            $response.AddHeader("Expires", "0")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch {
        # Handle server shutdown or disconnect gracefully
    }
}
