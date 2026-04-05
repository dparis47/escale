# ============================================================
# Convertir tous les fichiers .doc en .docx
# Utilise Microsoft Word installe sur le poste
# ============================================================
# Usage :
#   1. Clic droit sur ce fichier > "Executer avec PowerShell"
#   2. Ou dans PowerShell : .\convertir-doc-en-docx.ps1 -Dossier "C:\chemin\vers\dossier"
#
# Les fichiers .docx sont crees dans le meme dossier que les .doc
# Les fichiers .doc originaux ne sont PAS supprimes
# ============================================================

param(
    [string]$Dossier = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$fichiers = Get-ChildItem -Path $Dossier -Filter "*.doc" | Where-Object { $_.Extension -eq ".doc" }

if ($fichiers.Count -eq 0) {
    Write-Host "Aucun fichier .doc trouve dans : $Dossier" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour fermer"
    exit
}

Write-Host "=== Conversion .doc vers .docx ===" -ForegroundColor Cyan
Write-Host "$($fichiers.Count) fichier(s) .doc trouve(s) dans : $Dossier"
Write-Host ""

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $true  # Visible pour voir si Word affiche une popup
    $word.DisplayAlerts = 0  # wdAlertsNone
    $word.AutomationSecurity = 3  # msoAutomationSecurityForceDisable
    $word.Options.ConfirmConversions = $false
} catch {
    Write-Host "ERREUR : Microsoft Word n'est pas installe sur ce poste." -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

$convertis = 0
$erreurs = 0
$timeout = 30  # secondes max par fichier

foreach ($fichier in $fichiers) {
    $docx = Join-Path $fichier.DirectoryName ($fichier.BaseName + ".docx")

    if (Test-Path $docx) {
        Write-Host "  IGNORE (existe deja) : $($fichier.Name)" -ForegroundColor DarkGray
        continue
    }

    Write-Host "  Conversion : $($fichier.Name) ..." -NoNewline

    # Lancer l'ouverture dans un job avec timeout
    $job = Start-Job -ScriptBlock {
        param($wordPid, $src, $dst)
        $word = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
        $doc = $word.Documents.Open($src, $false, $true, $false, " ")
        $doc.SaveAs2($dst, 16)
        $doc.Close(0)
        return "OK"
    } -ArgumentList (Get-Process WINWORD -ErrorAction SilentlyContinue | Select-Object -First 1).Id, $fichier.FullName, $docx

    $done = $job | Wait-Job -Timeout $timeout

    if ($done) {
        $result = Receive-Job $job -ErrorAction SilentlyContinue
        $jobError = $job.ChildJobs[0].Error
        Remove-Job $job -Force
        if ($jobError.Count -gt 0) {
            Write-Host " ERREUR : $($jobError[0])" -ForegroundColor Red
            $erreurs++
        } else {
            Write-Host " OK" -ForegroundColor Green
            $convertis++
        }
    } else {
        # Timeout - Word est probablement bloque par une popup
        Write-Host " BLOQUE (timeout ${timeout}s - popup Word ?)" -ForegroundColor Yellow
        Stop-Job $job
        Remove-Job $job -Force
        # Fermer le document bloquant
        try {
            foreach ($d in $word.Documents) { $d.Close(0) }
        } catch {}
        $erreurs++
    }
}

$word.Quit()
try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}

Write-Host ""
Write-Host "=== Termine ===" -ForegroundColor Cyan
Write-Host "  $convertis converti(s), $erreurs erreur(s)"
Write-Host ""
Read-Host "Appuyez sur Entree pour fermer"
