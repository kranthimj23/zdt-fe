# Create Jenkins Server VM on Google Cloud Platform (Windows PowerShell)
# Usage: .\create-jenkins-vm.ps1 [-ProjectId "your-project-id"] [-Zone "us-central1-a"]
#
# Prerequisites:
# - Google Cloud SDK installed and authenticated
# - Sufficient permissions to create VMs and firewall rules

param(
    [string]$ProjectId = "cloudlearnhub-gke-1546",
    [string]$Zone = "us-central1-a",
    [string]$VmName = "jenkins-server",
    [string]$MachineType = "e2-medium",
    [string]$BootDiskSize = "200GB"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Jenkins Server VM Creation Script ===" -ForegroundColor Cyan
Write-Host "Project ID: $ProjectId"
Write-Host "Zone: $Zone"
Write-Host "VM Name: $VmName"
Write-Host "Machine Type: $MachineType"
Write-Host "Boot Disk Size: $BootDiskSize"
Write-Host ""

# Set the project
Write-Host "Setting project to $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if startup.sh exists
$StartupScript = Join-Path $ScriptDir "startup.sh"
if (-not (Test-Path $StartupScript)) {
    Write-Host "ERROR: startup.sh not found at $StartupScript" -ForegroundColor Red
    exit 1
}

# Check if VM already exists
$VmExists = gcloud compute instances describe $VmName --zone=$Zone --project=$ProjectId 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "ERROR: VM '$VmName' already exists in zone '$Zone'" -ForegroundColor Red
    Write-Host "To delete it, run: gcloud compute instances delete $VmName --zone=$Zone --project=$ProjectId"
    exit 1
}

# Create the VM with startup script
Write-Host "Creating Jenkins server VM..." -ForegroundColor Yellow
gcloud compute instances create $VmName `
    --zone=$Zone `
    --machine-type=$MachineType `
    --image-family=ubuntu-2204-lts `
    --image-project=ubuntu-os-cloud `
    --boot-disk-size=$BootDiskSize `
    --boot-disk-type=pd-standard `
    --scopes=https://www.googleapis.com/auth/cloud-platform `
    --tags=jenkins-server `
    --project=$ProjectId `
    --metadata-from-file=startup-script=$StartupScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create VM" -ForegroundColor Red
    exit 1
}

Write-Host "VM created successfully!" -ForegroundColor Green

# Create firewall rule for Jenkins
Write-Host "Creating firewall rules..." -ForegroundColor Yellow

$FirewallExists = gcloud compute firewall-rules describe allow-jenkins --project=$ProjectId 2>$null
if ($LASTEXITCODE -ne 0) {
    gcloud compute firewall-rules create allow-jenkins `
        --allow="tcp:8080,tcp:50000" `
        --target-tags=jenkins-server `
        --description="Allow Jenkins web UI and JNLP agent connections" `
        --project=$ProjectId
    Write-Host "Firewall rule 'allow-jenkins' created." -ForegroundColor Green
} else {
    Write-Host "Firewall rule 'allow-jenkins' already exists." -ForegroundColor Yellow
}

# Wait and get external IP
Write-Host ""
Write-Host "Waiting for VM to get external IP..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$ExternalIP = gcloud compute instances describe $VmName `
    --zone=$Zone `
    --format="value(networkInterfaces[0].accessConfigs[0].natIP)" `
    --project=$ProjectId

Write-Host ""
Write-Host "=== VM Creation Complete ===" -ForegroundColor Green
Write-Host "External IP: $ExternalIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "Jenkins will be available at: http://${ExternalIP}:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Wait 3-5 minutes for Jenkins to finish installing, then run:" -ForegroundColor Yellow
Write-Host "gcloud compute ssh $VmName --zone=$Zone --project=$ProjectId --command='sudo cat /var/lib/jenkins/secrets/initialAdminPassword'"
Write-Host ""
Write-Host "To SSH into the VM:" -ForegroundColor Yellow
Write-Host "gcloud compute ssh $VmName --zone=$Zone --project=$ProjectId"
