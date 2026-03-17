$ErrorActionPreference = 'Continue'

function Write-Step($message) {
  Write-Host "`n[$message]" -ForegroundColor Cyan
}

function Write-Success($message) {
  Write-Host "  OK: $message" -ForegroundColor Green
}

function Write-Skip($message) {
  Write-Host "  SKIP: $message" -ForegroundColor Gray
}

function Write-Action($message) {
  Write-Host "  ACTION: $message" -ForegroundColor Yellow
}

function Remove-PathSafely {
  param($targetPath)

  if (-not (Test-Path $targetPath)) {
    return $true
  }

  try {
    attrib -r -s -h "$targetPath" /s /d 2>$null | Out-Null
  }
  catch {
  }

  try {
    Remove-Item -Path $targetPath -Recurse -Force -ErrorAction Stop
  }
  catch {
    try {
      cmd /c rmdir /s /q "$targetPath" | Out-Null
    }
    catch {
    }
  }

  return -not (Test-Path $targetPath)
}

function Stop-TargetProcesses {
  Write-Step "Stopping processes"
  
  $processNames = @('CDP Bridge')
  foreach ($processName in $processNames) {
    $procs = Get-Process -Name $processName -ErrorAction SilentlyContinue
    if ($procs) {
      Write-Action "Stopping $processName processes"
      $procs | Stop-Process -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    }
  }
  
  Get-Process | Where-Object {
    $_.Path -and (
      $_.Path -like '*\Program Files\CDP Bridge*' -or
      $_.Path -like '*\Program Files\Agent Browser Bridge*' -or
      $_.Path -like '*\AppData\Local\Programs\CDP Bridge*' -or
      $_.Path -like '*\AppData\Local\Programs\Agent Browser Bridge*'
    )
  } | ForEach-Object {
    Write-Action "Stopping process $($_.Name) (PID: $($_.Id)) at $($_.Path)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }

  $managedBrowserPids = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -match '^(chrome|msedge)\.exe$' -and $_.CommandLine -and (
      $_.CommandLine -like '*cdp-bridge*' -or
      $_.CommandLine -like '*--remote-debugging-port=9222*'
    )
  } | Select-Object -ExpandProperty ProcessId

  foreach ($processId in @($managedBrowserPids | Select-Object -Unique)) {
    if ($processId) {
      Write-Action "Stopping managed browser PID $processId"
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
  
  Start-Sleep -Seconds 1
}

function Get-AllUninstallEntries {
  $registryRoots = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
  )
  
  $allEntries = @()
  
  foreach ($root in $registryRoots) {
    $subkeys = Get-ChildItem $root -ErrorAction SilentlyContinue
    foreach ($subkey in $subkeys) {
      $props = Get-ItemProperty $subkey.PSPath -ErrorAction SilentlyContinue
      if ($props.DisplayName) {
        $allEntries += [PSCustomObject]@{
          DisplayName     = $props.DisplayName
          Publisher       = $props.Publisher
          UninstallString = $props.UninstallString
          QuietUninstall  = $props.QuietUninstallString
          InstallLocation = $props.InstallLocation
          RegistryPath    = $subkey.PSPath
        }
      }
    }
  }
  
  return $allEntries
}

function Find-CDPBridgeEntries {
  param($entries)
  
  return $entries | Where-Object {
    $name = $_.DisplayName
    $publisher = $_.Publisher
    
    $nameMatches = $name -match 'CDP.*Bridge|Agent.*Browser.*Bridge'
    $publisherMatches = $publisher -eq 'bsbofmusic'
    
    $nameMatches -or $publisherMatches
  }
}

function Invoke-SilentUninstall {
  param($entry)
  
  $name = $entry.DisplayName
  $uninstCmd = $entry.QuietUninstall
  if (-not $uninstCmd) {
    $uninstCmd = $entry.UninstallString
  }
  
  if (-not $uninstCmd) {
    Write-Skip "No uninstall command for: $name"
    return $false
  }
  
  Write-Action "Uninstalling: $name"
  Write-Host "    Command: $uninstCmd"
  
  $exePath = $null
  $args = $null
  
  if ($uninstCmd -match '"([^"]+)"(.*)') {
    $exePath = $matches[1]
    $args = $matches[2].Trim()
  }
  elseif ($uninstCmd -match '^(\S+)(.*)') {
    $exePath = $matches[1]
    $args = $matches[2].Trim()
  }
  else {
    $exePath = $uninstCmd
    $args = ''
  }
  
  if (-not (Test-Path $exePath)) {
    Write-Skip "Uninstaller not found: $exePath"
    return $false
  }
  
  if ($exePath -match 'msiexec') {
    $args = "$args /qn /norestart"
    Write-Host "    MSI args: $args"
    Start-Process -FilePath $exePath -ArgumentList $args -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue
  }
  else {
    if ($args -notmatch '/S' -and $args -notmatch '/VERYSILENT') {
      $args = "/S $args"
    }
    $args = "$args /SUPPRESSMSGBOXES /NORESTART"
    $args = $args.Trim()
    Write-Host "    NSIS args: $args"
    Start-Process -FilePath $exePath -ArgumentList $args -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue
  }
  
  Start-Sleep -Seconds 2
  return $true
}

function Remove-RegistryEntries {
  param($entries)
  
  Write-Step "Cleaning registry entries"
  
  foreach ($entry in $entries) {
    $path = $entry.RegistryPath
    if ($path) {
      Write-Action "Removing registry key: $path"
      Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Remove-InstallDirectories {
  Write-Step "Removing installation directories"
  
  $dirsToRemove = @()
  
  $env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA | ForEach-Object {
    if ($_ -and (Test-Path $_)) {
      Get-ChildItem $_ -Directory -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match 'CDP.*Bridge|Agent.*Browser.*Bridge'
      } | ForEach-Object {
        $dirsToRemove += $_.FullName
      }
    }
  }
  
  foreach ($drive in @('C', 'D', 'E', 'F', 'G')) {
    $pf = "${drive}:\Program Files"
    if (Test-Path $pf) {
      Get-ChildItem $pf -Directory -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match 'CDP.*Bridge|Agent.*Browser.*Bridge'
      } | ForEach-Object {
        $dirsToRemove += $_.FullName
      }
    }
    
    $pf86 = "${drive}:\Program Files (x86)"
    if (Test-Path $pf86) {
      Get-ChildItem $pf86 -Directory -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match 'CDP.*Bridge|Agent.*Browser.*Bridge'
      } | ForEach-Object {
        $dirsToRemove += $_.FullName
      }
    }
  }
  
  $dirsToRemove = $dirsToRemove | Select-Object -Unique
  
  foreach ($dir in $dirsToRemove) {
    if (Test-Path $dir) {
      Write-Action "Removing: $dir"
      if (-not (Remove-PathSafely $dir)) {
        Write-Host "    WARNING: Could not fully remove $dir" -ForegroundColor Red
      }
      else {
        Write-Success "Removed: $dir"
      }
    }
  }
}

function Remove-AppData {
  Write-Step "Removing application data"
  
  $dataDirs = @(
    (Join-Path $env:USERPROFILE '.cdp-bridge'),
    (Join-Path $env:APPDATA 'cdp-bridge'),
    (Join-Path $env:APPDATA 'cdp-bridge-dev'),
    (Join-Path $env:LOCALAPPDATA 'cdp-bridge-updater'),
    (Join-Path $env:LOCALAPPDATA 'cdp-bridge'),
    (Join-Path $env:APPDATA 'Agent Browser Bridge'),
    (Join-Path $env:LOCALAPPDATA 'agent-browser-bridge-updater')
  )
  
  foreach ($dir in $dataDirs) {
    if (Test-Path $dir) {
      Write-Action "Removing: $dir"
      if (Remove-PathSafely $dir) {
        Write-Success "Removed: $dir"
      }
      else {
        Write-Host "    WARNING: Could not fully remove $dir" -ForegroundColor Red
      }
    }
    else {
      Write-Skip "Not found: $dir"
    }
  }
}

function Remove-Shortcuts {
  Write-Step "Removing shortcuts"
  
  $shortcuts = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'CDP Bridge.lnk'),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Agent Browser Bridge.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\CDP Bridge.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Agent Browser Bridge.lnk'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\CDP Bridge.lnk'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\Agent Browser Bridge.lnk')
  )
  
  foreach ($shortcut in $shortcuts) {
    if (Test-Path $shortcut) {
      Write-Action "Removing: $shortcut"
      Remove-Item -Path $shortcut -Force -ErrorAction SilentlyContinue
      Write-Success "Removed shortcut"
    }
  }
  
  $startMenuDirs = @(
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\CDP Bridge'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Agent Browser Bridge'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\CDP Bridge'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\Agent Browser Bridge')
  )
  
  foreach ($dir in $startMenuDirs) {
    if (Test-Path $dir) {
      Write-Action "Removing: $dir"
      Remove-PathSafely $dir | Out-Null
    }
  }
}

function Test-CleanState {
  Write-Step "Verifying clean state"
  
  $issues = @()
  
  $allEntries = Get-AllUninstallEntries
  $cdpEntries = Find-CDPBridgeEntries -entries $allEntries
  $entryCount = @($cdpEntries).Count
  if ($entryCount -gt 0) {
    $issues += "Registry entries still exist: $entryCount found"
  }
  
  $pfCheckPaths = @(
    (Join-Path $env:ProgramFiles 'CDP Bridge'),
    (Join-Path $env:ProgramFiles 'Agent Browser Bridge'),
    'D:\Program Files\CDP Bridge'
  )
  
  foreach ($p in $pfCheckPaths) {
    if (Test-Path $p) {
      $issues += "Install directory still exists: $p"
    }
  }
  
  $dataCheckPaths = @(
    (Join-Path $env:USERPROFILE '.cdp-bridge'),
    (Join-Path $env:APPDATA 'cdp-bridge'),
    (Join-Path $env:LOCALAPPDATA 'cdp-bridge-updater')
  )
  
  foreach ($p in $dataCheckPaths) {
    if (Test-Path $p) {
      $issues += "Data directory still exists: $p"
    }
  }
  
  if ($issues.Count -eq 0) {
    Write-Success "System is clean - ready for fresh install"
    return $true
  }
  else {
    Write-Host "  WARNINGS:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
      Write-Host "    - $issue" -ForegroundColor Yellow
    }
    return $false
  }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CDP Bridge - Clean Reinstall Preparation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "This may take a while on slower PCs. Please wait for the installer to continue." -ForegroundColor Yellow

Stop-TargetProcesses

$allEntries = Get-AllUninstallEntries
Write-Step "Searching for CDP Bridge installations"
Write-Host "  Found $($allEntries.Count) total uninstall entries"

$cdpEntries = Find-CDPBridgeEntries -entries $allEntries
if ($cdpEntries) {
  Write-Host "  Found $($cdpEntries.Count) CDP Bridge entries:"
  foreach ($e in $cdpEntries) {
    Write-Host "    - $($e.DisplayName)"
  }
  
  foreach ($entry in $cdpEntries) {
    Stop-TargetProcesses
    Invoke-SilentUninstall -entry $entry | Out-Null
  }
  
  Start-Sleep -Seconds 2
  Stop-TargetProcesses
  
  Remove-RegistryEntries -entries $cdpEntries
}
else {
  Write-Skip "No CDP Bridge installations found in registry"
}

Stop-TargetProcesses
Remove-InstallDirectories
Remove-AppData
Remove-Shortcuts

Test-CleanState | Out-Null

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Clean reinstall preparation complete!" -ForegroundColor Green
Write-Host "You can now run the latest installer." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
