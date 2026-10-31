<#
.SYNOPSIS
    Audit de l'environnement Windows de developpement (LECTURE SEULE).
.DESCRIPTION
    Verifie Windows, materiel, outils (Node, pnpm, Git, gh, wrangler, supabase, Docker,
    Python, VS Code), virtualisation/WSL2, ports occupes, chemins longs, antivirus,
    proxy et fuseau horaire. N'installe rien, ne modifie rien, n'ecrit que le rapport.
.PARAMETER OutFile
    Chemin du rapport Markdown a produire (defaut: audit-windows.md).
.EXAMPLE
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\scripts\audit-windows.ps1 -OutFile .\audit-windows.md
.NOTES
    Compatible PowerShell 5.1 (Windows 10) et PowerShell 7+.
    Aucun secret n'est collecte. Aucune donnee personnelle n'est transmise.
#>

[CmdletBinding()]
param(
    [string]$OutFile = "audit-windows.md"
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$lines = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$text = "") { $lines.Add($text) }
function Add-Row([string]$a, [string]$b, [string]$c = "") {
    if ($c -ne "") { Add-Line("| $a | $b | $c |") } else { Add-Line("| $a | $b |") }
}
function Get-CmdVersion([string]$exe, [string]$arg = "--version") {
    $cmd = Get-Command $exe -ErrorAction SilentlyContinue
    if (-not $cmd) { return @{ Found = $false; Version = "ABSENT"; Path = "" } }
    $out = ""
    try { $out = (& $exe $arg 2>&1 | Select-Object -First 1) } catch { $out = "erreur" }
    return @{ Found = $true; Version = ("$out" -replace "\s+", " ").Trim(); Path = $cmd.Source }
}

Add-Line("# Audit environnement Windows - WhatsAuto AI")
Add-Line ""
Add-Line("Date : " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"))
Add-Line("Machine : " + $env:COMPUTERNAME + "  |  Utilisateur : " + $env:USERNAME)
Add-Line ""

# ---------------------------------------------------------------- Systeme
Add-Line "## 1. Systeme"
Add-Line ""
Add-Line "| Element | Valeur |"
Add-Line "|---|---|"
try {
    $os = Get-CimInstance Win32_OperatingSystem
    Add-Row "OS" ($os.Caption + " (" + $os.Version + " build " + $os.BuildNumber + ")")
    Add-Row "Architecture" $os.OSArchitecture
    Add-Row "RAM totale" ([math]::Round($os.TotalVisibleMemorySize / 1MB, 2).ToString() + " Go")
    Add-Row "RAM libre" ([math]::Round($os.FreePhysicalMemory / 1MB, 2).ToString() + " Go")
    Add-Row "Dernier demarrage" ($os.LastBootUpTime.ToString("yyyy-MM-dd HH:mm"))
} catch { Add-Row "OS" "NON MESURE ($($_.Exception.Message))" }
try {
    $psh = $PSVersionTable
    Add-Row "PowerShell" ($psh.PSVersion.ToString() + " / edition " + $psh.PSEdition)
} catch { Add-Row "PowerShell" "NON MESURE" }
Add-Row "Fuseau horaire" ((Get-TimeZone).Id + " - UTC" + [TimeZoneInfo]::Local.BaseUtcOffset)
Add-Row "Culture" ([System.Globalization.CultureInfo]::CurrentCulture.Name)

Add-Line ""
Add-Line "### Disques"
Add-Line ""
Add-Line "| Lecteur | Libre (Go) | Total (Go) | Usage |"
Add-Line "|---|---|---|---|"
try {
    Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
        $free = [math]::Round($_.FreeSpace / 1GB, 1)
        $tot  = [math]::Round($_.Size / 1GB, 1)
        $pct  = if ($tot -gt 0) { [math]::Round((($tot - $free) / $tot) * 100, 0) } else { 0 }
        Add-Row ("" + $_.DeviceID) ($free.ToString() + " Go libres") ($tot.ToString() + " Go au total - " + $pct + " % utilise")
    }
} catch { Add-Row "-" "NON MESURE" "-" "-" }

# ---------------------------------------------------------------- Outils
Add-Line ""
Add-Line "## 2. Outils de developpement"
Add-Line ""
Add-Line "| Outil | Version | Chemin |"
Add-Line "|---|---|---|"
$tools = @(
    @{ n = "node";    a = "--version" },
    @{ n = "npm";     a = "--version" },
    @{ n = "pnpm";    a = "--version" },
    @{ n = "yarn";    a = "--version" },
    @{ n = "git";     a = "--version" },
    @{ n = "gh";      a = "--version" },
    @{ n = "wrangler";a = "--version" },
    @{ n = "supabase";a = "--version" },
    @{ n = "python";  a = "--version" },
    @{ n = "python3"; a = "--version" },
    @{ n = "docker";  a = "--version" },
    @{ n = "code";    a = "--version" },
    @{ n = "winget";  a = "--version" },
    @{ n = "psql";    a = "--version" },
    @{ n = "curl";    a = "--version" }
)
foreach ($t in $tools) {
    $r = Get-CmdVersion $t.n $t.a
    if ($r.Found) { Add-Row $t.n $r.Version $r.Path } else { Add-Row $t.n "ABSENT" "-" }
}

Add-Line ""
Add-Line "### Verifications ciblees"
Add-Line ""
Add-Line "| Verification | Resultat |"
Add-Line "|---|---|"
try {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $major = [int]((& node -p "process.versions.node.split('.')[0]") 2>$null)
        $verdict = if ($major -ge 22) { "OK (22+ recommande)" } elseif ($major -ge 20) { "OK (20 LTS, 22 recommande)" } else { "INSUFFISANT (>=20 requis)" }
        Add-Row "Node version majeure" "$major -> $verdict"
    } else { Add-Row "Node" "ABSENT - bloquant" }
} catch { Add-Row "Node version majeure" "NON MESURE" }
try {
    $gituser = (& git config --global user.name 2>$null)
    $gitmail = (& git config --global user.email 2>$null)
    Add-Row "Git identity" ("name=" + $gituser + " / email=" + $gitmail)
} catch { Add-Row "Git identity" "non configuree" }
try {
    $lp = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -ErrorAction Stop).LongPathsEnabled
    Add-Row "LongPathsEnabled" ("$lp" + $(if ($lp -eq 1) { " (OK)" } else { " (recommande : activer)" }))
} catch { Add-Row "LongPathsEnabled" "NON MESURE" }
try {
    Add-Row "Politique d'execution" ((Get-ExecutionPolicy) -as [string])
} catch { Add-Row "Politique d'execution" "NON MESURE" }
try {
    $wsl = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wsl) {
        $distros = ((& wsl --list --quiet 2>$null) -join ", ") -replace "`0", ""
        Add-Row "WSL2" ("present. Distributions : " + $(if ($distros) { $distros } else { "aucune" }))
    } else { Add-Row "WSL2" "absent (optionnel mais recommande)" }
} catch { Add-Row "WSL2" "NON MESURE" }
try {
    $virt = (Get-CimInstance Win32_ComputerSystem).HypervisorPresent
    Add-Row "Hyperviseur present" "$virt"
} catch { Add-Row "Hyperviseur present" "NON MESURE" }

Add-Line ""
Add-Line "### Extensions VS Code (si applicables)"
Add-Line ""
try {
    $ext = & code --list-extensions 2>$null
    if ($ext) {
        Add-Line '```'
        $ext | ForEach-Object { if ($_ -match 'eslint|prettier|tailwind|typescript|vitest|playwright|gitlens|errorlens|i18n|sql|wrangler|cloudflare|supabase|hono|react') { Add-Line $_ } }
        Add-Line '```'
    } else { Add-Line "_Aucune extension listee ou CLI `code` indisponible._" }
} catch { Add-Line "_CLI `code` indisponible._" }

# ---------------------------------------------------------------- Reseau
Add-Line ""
Add-Line "## 3. Reseau et connectivite"
Add-Line ""
Add-Line "| Test | Resultat |"
Add-Line "|---|---|"
$targets = @(
    @{ n = "registry.npmjs.org:443";        h = "registry.npmjs.org";        p = 443 },
    @{ n = "api.github.com:443";             h = "api.github.com";             p = 443 },
    @{ n = "api.cloudflare.com:443";         h = "api.cloudflare.com";         p = 443 },
    @{ n = "supabase.co:443 (auth/db)";      h = "supabase.co";               p = 443 },
    @{ n = "graph.facebook.com:443 (Meta)";  h = "graph.facebook.com";        p = 443 },
    @{ n = "generativelanguage.googleapis.com:443"; h = "generativelanguage.googleapis.com"; p = 443 }
)
foreach ($t in $targets) {
    $ok = $false
    try { $ok = Test-NetConnection -ComputerName $t.h -Port $t.p -InformationLevel Quiet -WarningAction SilentlyContinue } catch { $ok = $false }
    if (-not $ok) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $iar = $client.BeginConnect($t.h, $t.p, $null, $null)
            $ok = $iar.AsyncWaitHandle.WaitOne(3000) -and $client.Connected
            $client.Close()
        } catch { $ok = $false }
    }
    Add-Row $t.n $(if ($ok) { "JOIGNABLE" } else { "INJOIGNABLE" })
}
$proxy = [System.Net.WebRequest]::DefaultWebProxy
if ($proxy) {
    try { Add-Row "Proxy systeme" ($proxy.GetProxy([uri]"https://registry.npmjs.org").AbsoluteUri) } catch { Add-Row "Proxy systeme" "defini (non resolu)" }
} else { Add-Row "Proxy systeme" "aucun" }

Add-Line ""
Add-Line "## 4. Ports locaux occupes (dev)"
Add-Line ""
Add-Line "| Port | Usage prevu | Etat |"
Add-Line "|---|---|---|"
$ports = @(
    @{ p = 3000;  u = "web (alternatif)" },
    @{ p = 5173;  u = "Vite dev server" },
    @{ p = 8787;  u = "wrangler dev (API Worker)" },
    @{ p = 5432;  u = "PostgreSQL local (optionnel)" },
    @{ p = 54321; u = "Supabase CLI local" }
)
foreach ($pt in $ports) {
    $busy = $false
    try {
        $busy = [bool](Get-NetTCPConnection -LocalPort $pt.p -State Listen -ErrorAction SilentlyContinue)
    } catch { }
    Add-Row ("" + $pt.p) $pt.u $(if ($busy) { "OCCUPE" } else { "libre" })
}

# ---------------------------------------------------------------- Securite
Add-Line ""
Add-Line "## 5. Securite de la machine de developpement"
Add-Line ""
Add-Line "| Controle | Etat |"
Add-Line "|---|---|"
try {
    $def = Get-MpComputerStatus -ErrorAction Stop
    Add-Row "Defender temps reel" ("RealTimeProtectionEnabled=" + $def.RealTimeProtectionEnabled)
    Add-Row "Defender a jour" ("AntivirusSignatureLastUpdated=" + $def.AntivirusSignatureLastUpdated)
} catch { Add-Row "Defender" "NON MESURE (non-Windows-Defender ?)" }
try {
    $bl = Get-BitLockerVolume -ErrorAction Stop | Select-Object -First 1
    Add-Row "BitLocker (volume systeme)" ("Protection=" + $bl.ProtectionStatus)
} catch { Add-Row "BitLocker" "NON MESURE" }
try {
    $fs = Get-MpPreference -ErrorAction Stop
    Add-Row "Exclusions Defender" $(if ($fs.ExclusionPath) { ($fs.ExclusionPath -join "; ") } else { "aucune" })
} catch { Add-Row "Exclusions Defender" "NON MESURE" }
Add-Row "Compte utilisateur (admin ?)" (([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))

# ---------------------------------------------------------------- Verdict
Add-Line ""
Add-Line "## 6. Verdict automatique"
Add-Line ""
$checks = @()
$n = Get-Command node -ErrorAction SilentlyContinue
if ($n) {
    try {
        $maj = [int]((& node -p "process.versions.node.split('.')[0]") 2>$null)
        $checks += [pscustomobject]@{ Name = "Node >= 20"; Ok = ($maj -ge 20); Detail = "v$maj" }
    } catch { $checks += [pscustomobject]@{ Name = "Node >= 20"; Ok = $false; Detail = "version illisible" } }
} else { $checks += [pscustomobject]@{ Name = "Node >= 20"; Ok = $false; Detail = "absent" } }
$checks += [pscustomobject]@{ Name = "npm present"; Ok = [bool](Get-Command npm -ErrorAction SilentlyContinue); Detail = "" }
$checks += [pscustomobject]@{ Name = "Git present"; Ok = [bool](Get-Command git -ErrorAction SilentlyContinue); Detail = "" }
$checks += [pscustomobject]@{ Name = "gh present"; Ok = [bool](Get-Command gh -ErrorAction SilentlyContinue); Detail = "" }
try {
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction Stop
    $freeGb = [math]::Round($disk.FreeSpace / 1GB, 1)
    $checks += [pscustomobject]@{ Name = "Disque C: >= 10 Go libre"; Ok = ($freeGb -ge 10); Detail = "$freeGb Go" }
} catch { }
try {
    $ramGb = [math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1MB, 1)
    $checks += [pscustomobject]@{ Name = "RAM >= 8 Go"; Ok = ($ramGb -ge 8); Detail = "$ramGb Go" }
} catch { }

Add-Line "| Critere | Etat | Detail |"
Add-Line "|---|---|---|"
foreach ($c in $checks) { Add-Row $c.Name $(if ($c.Ok) { "OK" } else { "A CORRIGER" }) $c.Detail }
Add-Line ""
if (($checks | Where-Object { -not $_.Ok }).Count -eq 0) {
    Add-Line "**Verdict : machine conforme pour demarrer la Phase 3.**"
} else {
    Add-Line "**Verdict : machine utilisable partiellement. Corriger les points 'A CORRIGER' avant la Phase 3.**"
}
Add-Line ""
Add-Line "_Rapport genere par scripts/audit-windows.ps1 - aucune modification systeme effectuee._"

# ---------------------------------------------------------------- Ecriture
$dir = Split-Path -Parent $OutFile
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
Set-Content -Path $OutFile -Value $lines -Encoding UTF8
Write-Host ""
Write-Host "Rapport ecrit dans : $OutFile" -ForegroundColor Green
Write-Host "Aucune modification n'a ete apportee au systeme." -ForegroundColor Green
