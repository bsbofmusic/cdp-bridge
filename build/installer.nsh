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

    ${NSD_CreateLabel} 0 0 100% 22u "Optional clean install"
    Pop $0

    ${NSD_CreateLabel} 0 18u 100% 28u "Use this if you previously ran the dev build or still see the old window after reinstalling. It removes leftover dev files and stale tray conflicts without deleting your main installed profile."
    Pop $0

    ${NSD_CreateCheckbox} 0 54u 100% 12u "Clean previous local/dev leftovers before completing installation"
    Pop $CleanInstallCheckbox
    ${NSD_SetState} $CleanInstallCheckbox ${BST_UNCHECKED}

    nsDialogs::Show
  FunctionEnd

  Function CleanInstallPageLeave
    ${NSD_GetState} $CleanInstallCheckbox $CleanInstallRequested
  FunctionEnd

  !macro customInstall
    ${If} $CleanInstallRequested == ${BST_CHECKED}
      nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File "$INSTDIR\scripts\clean-install.ps1"'
    ${EndIf}
  !macroend
!endif
