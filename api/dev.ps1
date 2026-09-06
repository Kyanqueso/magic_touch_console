#requires -Version 5
# Run the API without depending on PATH or terminal state.
#
#   .\dev.ps1            ->  mvn quarkus:dev  (live-reload server)
#   .\dev.ps1 test       ->  mvn test
#   .\dev.ps1 clean package
#
# Edit the two paths below if you move the JDK / Maven install.

$ErrorActionPreference = 'Stop'

$java  = 'C:\Program Files\Java\jdk-21.0.12'
$maven = 'C:\Program Files\Java\apache-maven-3.9.16'

if (-not (Test-Path $java))  { throw "JDK not found at $java" }
if (-not (Test-Path $maven)) { throw "Maven not found at $maven" }

$env:JAVA_HOME = $java
$env:Path = "$java\bin;$maven\bin;$env:Path"
Set-Location $PSScriptRoot

$goal = if ($args.Count -gt 0) { $args } else { @('quarkus:dev') }
Write-Host "> mvn $($goal -join ' ')" -ForegroundColor Cyan
& "$maven\bin\mvn.cmd" @goal
