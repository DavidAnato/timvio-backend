# Verifie si Git est installe
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "[ERREUR] Git n'est pas installe sur ce systeme."
    exit 1
}

# Recupere les fichiers modifies, ajoutes et supprimes
$changes = git status --porcelain

if (-not $changes) {
    Write-Host "[OK] Aucun changement detecte a committer."
    exit 0
}

# Prepare les differentes categories
$modified = @()
$added = @()
$deleted = @()

foreach ($line in $changes) {
    $status = $line.Substring(0, 2).Trim()
    $file = $line.Substring(3).Trim()

    switch -Regex ($status) {
        "M" { $modified += $file }
        "A" { $added += $file }
        "D" { $deleted += $file }
        default { continue }
    }
}

# Genere un message de commit
$commitMsg = @()

if ($added.Count -gt 0) {
    $commitMsg += "[AJOUT] " + ($added -join ', ')
}
if ($modified.Count -gt 0) {
    $commitMsg += "[MODIF] " + ($modified -join ', ')
}
if ($deleted.Count -gt 0) {
    $commitMsg += "[SUPPR] " + ($deleted -join ', ')
}

$fullMessage = $commitMsg -join "`n"

# Affiche le message de commit genere
Write-Host "`nMessage de commit propose :"
Write-Host $fullMessage -ForegroundColor Green

# Demande confirmation
$confirmation = Read-Host "`nSouhaites-tu utiliser ce message ? (y/n)"

if ($confirmation -ne "y") {
    $fullMessage = Read-Host "Saisis ton propre message de commit"
}

# Ajout et commit
git add .
git commit -m "$fullMessage"

Write-Host "`n[OK] Commit effectue avec succes." -ForegroundColor Cyan

# Confirmation pour push
$pushConfirmation = Read-Host "`nSouhaites-tu push ce commit ? (y/n)"
if ($pushConfirmation -eq "y") {
    git push
    Write-Host "`n[OK] Commit pousse avec succes." -ForegroundColor Cyan
} else {
    Write-Host "`n[INFO] Commit local uniquement. Push non effectue." -ForegroundColor Yellow
}