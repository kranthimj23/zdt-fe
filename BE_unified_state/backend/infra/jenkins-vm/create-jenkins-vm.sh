#!/bin/bash
# Create Jenkins Server VM on Google Cloud Platform
# Usage: ./create-jenkins-vm.sh [PROJECT_ID] [ZONE]
#
# Prerequisites:
# - Google Cloud SDK installed and authenticated
# - Sufficient permissions to create VMs and firewall rules

set -e

# Configuration
PROJECT_ID="${1:-cloudlearnhub-gke-1546}"
ZONE="${2:-us-central1-a}"
VM_NAME="jenkins-server"
MACHINE_TYPE="e2-medium"
BOOT_DISK_SIZE="200GB"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
NETWORK_TAG="jenkins-server"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Jenkins Server VM Creation Script ==="
echo "Project ID: ${PROJECT_ID}"
echo "Zone: ${ZONE}"
echo "VM Name: ${VM_NAME}"
echo "Machine Type: ${MACHINE_TYPE}"
echo "Boot Disk Size: ${BOOT_DISK_SIZE}"
echo ""

# Set the project
echo "Setting project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

# Check if VM already exists
if gcloud compute instances describe "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "ERROR: VM '${VM_NAME}' already exists in zone '${ZONE}'"
    echo "To delete it, run: gcloud compute instances delete ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID}"
    exit 1
fi

# Create the VM with startup script
echo "Creating Jenkins server VM..."
gcloud compute instances create "${VM_NAME}" \
    --zone="${ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family="${IMAGE_FAMILY}" \
    --image-project="${IMAGE_PROJECT}" \
    --boot-disk-size="${BOOT_DISK_SIZE}" \
    --boot-disk-type=pd-standard \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags="${NETWORK_TAG}" \
    --project="${PROJECT_ID}" \
    --metadata-from-file=startup-script="${SCRIPT_DIR}/startup.sh"

echo "VM created successfully!"

# Create firewall rule for Jenkins (port 8080) and JNLP (port 50000)
echo "Creating firewall rules..."

# Check if firewall rule exists
if ! gcloud compute firewall-rules describe allow-jenkins --project="${PROJECT_ID}" &>/dev/null; then
    gcloud compute firewall-rules create allow-jenkins \
        --allow=tcp:8080,tcp:50000 \
        --target-tags="${NETWORK_TAG}" \
        --description="Allow Jenkins web UI and JNLP agent connections" \
        --project="${PROJECT_ID}"
    echo "Firewall rule 'allow-jenkins' created."
else
    echo "Firewall rule 'allow-jenkins' already exists."
fi

# Get the external IP
echo ""
echo "Waiting for VM to get external IP..."
sleep 5

EXTERNAL_IP=$(gcloud compute instances describe "${VM_NAME}" \
    --zone="${ZONE}" \
    --format="value(networkInterfaces[0].accessConfigs[0].natIP)" \
    --project="${PROJECT_ID}")

echo ""
echo "=== VM Creation Complete ==="
echo "External IP: ${EXTERNAL_IP}"
echo ""
echo "Jenkins will be available at: http://${EXTERNAL_IP}:8080"
echo ""
echo "Wait 3-5 minutes for Jenkins to finish installing, then run:"
echo "gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='sudo cat /var/lib/jenkins/secrets/initialAdminPassword'"
echo ""
echo "To SSH into the VM:"
echo "gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID}"
