!ifndef BUILD_UNINSTALLER
  !include "nsDialogs.nsh"
  !include "LogicLib.nsh"

  Var CleanInstallRequested
  Var CleanInstallCheckbox

  !macro customPageAfterChangeDir
    Page custom CleanInstallPageCreate CleanInstallPageLeave
  !macroend

  Function CleanInstallPageCreate
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 22u "Optional clean reinstall"
    Pop $0

    ${NSD_CreateLabel} 0 18u 100% 40u "Use this if an older installed build still behaves strangely, stale tray processes keep hijacking the app, or previous local data keeps surviving reinstalls. The installer will first discover and uninstall older installed versions from Windows uninstall entries, then remove leftover app data, shortcuts, updater state, and leftover install directories as a fallback."
    Pop $0

    ${NSD_CreateCheckbox} 0 60u 100% 12u "Clean reinstall: remove old installed/dev leftovers before completing installation"
    Pop $CleanInstallCheckbox
    ${NSD_SetState} $CleanInstallCheckbox ${BST_UNCHECKED}

    nsDialogs::Show
  FunctionEnd

  Function CleanInstallPageLeave
    ${NSD_GetState} $CleanInstallCheckbox $CleanInstallRequested
    ${If} $CleanInstallRequested == ${BST_CHECKED}
      InitPluginsDir
      File /oname=$PLUGINSDIR\clean-install.ps1 "${PROJECT_DIR}\scripts\clean-install.ps1"
      Banner::show /NOUNLOAD "Clean reinstall in progress" "Removing old versions, runtime data, and stale processes before installation..."
      nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File "$PLUGINSDIR\clean-install.ps1"'
      Pop $0
      Banner::destroy
    ${EndIf}
  FunctionEnd

  !macro customInstall
  !macroend
!endif
