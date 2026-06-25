# Libère le port backend (défaut 5000)
$port = if ($args[0]) { [int]$args[0] } else { 5000 }

$connections = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
$processIds = @()

foreach ($line in $connections) {
    $parts = ($line -replace '\s+', ' ').Trim().Split(' ')
    $processId = $parts[-1]
    if ($processId -match '^\d+$' -and $processId -ne '0') {
        $processIds += [int]$processId
    }
}

$processIds = $processIds | Select-Object -Unique

if ($processIds.Count -eq 0) {
    Write-Host "Port $port deja libre."
    exit 0
}

foreach ($processId in $processIds) {
    try {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.ProcessName } else { 'inconnu' }
        Write-Host "Arret du processus $processId ($name) sur le port $port..."
        Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
        Write-Warning "Impossible d'arreter le PID $processId : $_"
    }
}

Start-Sleep -Milliseconds 500
Write-Host "Port $port libere."
