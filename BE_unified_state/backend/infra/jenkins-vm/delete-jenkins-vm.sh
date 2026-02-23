#!/bin/bash
# Delete Jenkins Server VM from Google Cloud Platform
# Usage: ./delete-jenkins-vm.sh [PROJECT_ID] [ZONE]

set -e

# Configuration
PROJECT_ID="${1:-cloudlearnhub-gke-1546}"
ZONE="${2:-us-central1-a}"
VM_NAME="jenkins-server"

echo "=== Jenkins Server VM Deletion Script ==="
echo "Project ID: ${PROJECT_ID}"
echo "Zone: ${ZONE}"
echo "VM Name: ${VM_NAME}"
echo ""

# Confirm deletion
read -p "Are you sure you want to delete the Jenkins server VM? (y/N): " confirm
if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
    echo "Deletion cancelled."
    exit 0
fi

# Set the project
gcloud config set project "${PROJECT_ID}"

# Delete the VM
echo "Deleting Jenkins server VM..."
if gcloud compute instances describe "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud compute instances delete "${VM_NAME}" \
        --zone="${ZONE}" \
        --project="${PROJECT_ID}" \
        --quiet
    echo "VM '${VM_NAME}' deleted successfully."
else
    echo "VM '${VM_NAME}' does not exist."
fi

# Optionally delete firewall rule
read -p "Do you also want to delete the firewall rule 'allow-jenkins'? (y/N): " delete_fw
if [[ "${delete_fw}" == "y" || "${delete_fw}" == "Y" ]]; then
    if gcloud compute firewall-rules describe allow-jenkins --project="${PROJECT_ID}" &>/dev/null; then
        gcloud compute firewall-rules delete allow-jenkins \
            --project="${PROJECT_ID}" \
            --quiet
        echo "Firewall rule 'allow-jenkins' deleted."
    else
        echo "Firewall rule 'allow-jenkins' does not exist."
    fi
fi

echo ""
echo "=== Cleanup Complete ==="
