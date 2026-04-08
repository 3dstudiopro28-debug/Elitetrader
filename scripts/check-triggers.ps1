# Test Supabase pg-meta endpoint to check and repair trigger
$envFile = Get-Content "C:\Users\LENOVO\Desktop\site\.env.local"
$svc = ($envFile | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "SUPABASE_SERVICE_ROLE_KEY=",""
$svc = $svc.Trim()

$baseUrl = "https://rekcdczbitcxaxcncrxi.supabase.co"
$headers = @{
  "apikey" = $svc
  "Authorization" = "Bearer $svc"
  "Content-Type" = "application/json"
}

# Try to list triggers via pg endpoint
Write-Host "=== Checking pg-meta triggers endpoint ==="
try {
  $resp = Invoke-WebRequest -Uri "$baseUrl/pg/triggers?limit=20" -Headers $headers -UseBasicParsing -ErrorAction Stop
  Write-Host "Status: $($resp.StatusCode)"
  Write-Host "Triggers: $($resp.Content)"
} catch {
  $st = $_.Exception.Response
  if ($st) {
    $s = $st.GetResponseStream()
    $r = New-Object System.IO.StreamReader($s)
    Write-Host "Trigger list error ($($st.StatusCode.value__)): $($r.ReadToEnd())"
  } else {
    Write-Host "No response: $($_.Exception.Message)"
  }
}
