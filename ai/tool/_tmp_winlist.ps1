Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ForEach-Object {
  Write-Output ("{0} | PID={1} | {2}" -f $_.ProcessName, $_.Id, $_.MainWindowTitle)
}
Write-Output '---'
Get-Process node,electron,cmd,powershell,conhost -ErrorAction SilentlyContinue |
  Select-Object ProcessName, Id, CPU, WorkingSet, StartTime, MainWindowTitle |
  Format-Table -AutoSize | Out-String -Width 200
