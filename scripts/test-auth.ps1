# Test Supabase auth directly
$svc = [System.Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", "Process")
if (-not $svc) {
  # Read from .env.local
  $env = Get-Content "C:\Users\LENOVO\Desktop\site\.env.local"
  $svc = ($env | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "SUPABASE_SERVICE_ROLE_KEY=", ""
}

$url = "https://rekcdczbitcxaxcncrxi.supabase.co/auth/v1/admin/users"
$body = '{"email":"directtest999@mail.io","password":"Senha@2024!","email_confirm":true,"user_metadata":{"first_name":"Direct","last_name":"Test"}}'
$headers = @{
  "apikey" = $svc
  "Authorization" = "Bearer $svc"
  "Content-Type" = "application/json"
}

Write-Host "Testing Supabase admin create user..."
try {
  $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
  Write-Host "Status: $($resp.StatusCode)"
  Write-Host "Body: $($resp.Content)"
} catch {
  $errResp = $_.Exception.Response
  if ($errResp) {
    $stream = $errResp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    Write-Host "Error Status: $($errResp.StatusCode.value__)"
    Write-Host "Error Body: $content"
  } else {
    Write-Host "Exception: $($_.Exception.Message)"
  }
}
