# Vérifie si Git est installé
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Git n'est pas installé sur ce système."
    exit 1
}

# Récupère les fichiers modifiés, ajoutés et supprimés
$changes = git status --porcelain

if (-not $changes) {
    Write-Host "✅ Aucun changement détecté à committer."
    exit 0
}

# Prépare les différentes catégories
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

# Génére un message de commit
$commitMsg = @()

if ($added.Count -gt 0) {
    $commitMsg += "🆕 Ajout de : " + ($added -join ', ')
}
if ($modified.Count -gt 0) {
    $commitMsg += "✏️ Modification de : " + ($modified -join ', ')
}
if ($deleted.Count -gt 0) {
    $commitMsg += "🗑️ Suppression de : " + ($deleted -join ', ')
}

$fullMessage = $commitMsg -join "`n"

# Affiche le message de commit généré
Write-Host "`n📄 Message de commit proposé :`n"
Write-Host $fullMessage -ForegroundColor Green

# Demande confirmation
$confirmation = Read-Host "`nSouhaites-tu utiliser ce message ? (y/n)"

if ($confirmation -ne "y") {
    $fullMessage = Read-Host "✍️ Saisis ton propre message de commit"
}

# Ajout et commit
git add .
git commit -m "$fullMessage"

Write-Host "`n✅ Commit effectué avec succès." -ForegroundColor Cyan
