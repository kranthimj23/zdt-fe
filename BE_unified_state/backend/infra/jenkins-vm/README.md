# Jenkins Server VM Setup

This directory contains scripts to create and configure a Jenkins server VM on Google Cloud Platform (GCP) with all required dependencies for CI/CD pipelines.

## Prerequisites

### Required Tools
- **Google Cloud SDK** (gcloud CLI) - [Installation Guide](https://cloud.google.com/sdk/docs/install)
- **GCP Account** with sufficient permissions to:
  - Create Compute Engine VMs
  - Create firewall rules
  - Access Cloud Storage (for artifacts)

### Authentication
```bash
# Login to GCP
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

## Quick Start

### Linux/macOS

```bash
# Make scripts executable
chmod +x *.sh

# Create Jenkins VM (uses default project: cloudlearnhub-gke-1546)
./create-jenkins-vm.sh

# Or specify custom project and zone
./create-jenkins-vm.sh YOUR_PROJECT_ID us-central1-a
```

### Windows (PowerShell)

```powershell
# Create Jenkins VM (uses default project: cloudlearnhub-gke-1546)
.\create-jenkins-vm.ps1

# Or specify custom project and zone
.\create-jenkins-vm.ps1 -ProjectId "YOUR_PROJECT_ID" -Zone "us-central1-a"
```

## What Gets Installed

The startup script automatically installs:

| Component | Version | Purpose |
|-----------|---------|---------|
| Java | OpenJDK 17 | Jenkins runtime |
| Jenkins | Latest LTS | CI/CD server |
| Docker | Latest | Container builds |
| Python | 3.11 | Deployment scripts |
| kubectl | 1.28 | Kubernetes deployments |
| Google Cloud SDK | Latest | GCP integrations |

## VM Specifications

| Setting | Value |
|---------|-------|
| Machine Type | e2-medium (2 vCPU, 4GB RAM) |
| Boot Disk | 200GB Standard Persistent Disk |
| OS | Ubuntu 22.04 LTS |
| Region | us-central1 (default) |
| Zone | us-central1-a (default) |

## Post-Installation Steps

### 1. Get Jenkins Initial Admin Password

Wait 3-5 minutes after VM creation, then run:

```bash
gcloud compute ssh jenkins-server --zone=us-central1-a --command='sudo cat /var/lib/jenkins/secrets/initialAdminPassword'
```

### 2. Access Jenkins Web UI

1. Get the VM's external IP:
   ```bash
   gcloud compute instances describe jenkins-server --zone=us-central1-a --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
   ```

2. Open in browser: `http://<EXTERNAL_IP>:8080`

3. Enter the initial admin password from step 1

4. Install suggested plugins

5. Create admin user

### 3. Configure Jenkins Credentials

For GKE deployments, add the following credentials in Jenkins:

1. **GitHub Token** (ID: `Jenkins-token-2`)
   - Type: Secret text
   - Value: Your GitHub Personal Access Token

2. **GCP Service Account** (if not using VM service account)
   - Copy service account key to: `/var/lib/jenkins/keys/`
   - Set permissions: `chmod 600 /var/lib/jenkins/keys/*.json`

### 4. Install Required Jenkins Plugins

Navigate to **Manage Jenkins > Plugins > Available plugins** and install:
- Git
- Pipeline
- Docker Pipeline
- Kubernetes CLI
- Google Kubernetes Engine

## File Structure

```
jenkins-vm/
├── README.md                 # This documentation
├── startup.sh               # VM startup script (installs all dependencies)
├── create-jenkins-vm.sh     # Linux/macOS VM creation script
├── create-jenkins-vm.ps1    # Windows PowerShell VM creation script
└── delete-jenkins-vm.sh     # Cleanup script to delete VM
```

## Cleanup

To delete the Jenkins server VM:

```bash
# Interactive deletion
./delete-jenkins-vm.sh

# Or manually
gcloud compute instances delete jenkins-server --zone=us-central1-a --quiet
gcloud compute firewall-rules delete allow-jenkins --quiet
```

## Troubleshooting

### Jenkins not accessible after VM creation

1. Wait 3-5 minutes for installation to complete
2. Check VM status: `gcloud compute instances describe jenkins-server --zone=us-central1-a`
3. SSH into VM and check logs:
   ```bash
   gcloud compute ssh jenkins-server --zone=us-central1-a
   sudo journalctl -u jenkins -f
   ```

### Docker permission denied

If Jenkins jobs fail with Docker permission errors:
```bash
gcloud compute ssh jenkins-server --zone=us-central1-a
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### GKE authentication issues

Ensure the VM has the correct scopes:
```bash
gcloud compute instances describe jenkins-server --zone=us-central1-a --format="value(serviceAccounts[0].scopes)"
```

The VM should have `https://www.googleapis.com/auth/cloud-platform` scope.

## Configuration Reference

### Environment Variables

The following environment variables are used in Jenkins pipelines:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| PROJECT_ID | cloudlearnhub-gke-1546 | GCP Project ID |
| CLUSTER | mygkecluster | GKE Cluster name |
| REGION | us-central1 | GCP Region |
| ZONE | us-central1-a | GCP Zone |
| PYTHON_EXEC | python3.11 | Python executable path |

### Firewall Rules

| Rule Name | Ports | Purpose |
|-----------|-------|---------|
| allow-jenkins | TCP 8080, 50000 | Jenkins Web UI and JNLP agents |

## Support

For issues or questions, refer to:
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [GCP Compute Engine Documentation](https://cloud.google.com/compute/docs)
- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
