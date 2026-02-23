#!/bin/bash
# Jenkins Server VM Startup Script
# This script is executed when the VM is created to install and configure Jenkins
# along with all required dependencies for CI/CD pipelines

set -e

echo "=== Starting Jenkins Server Setup ==="

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Java 17 (required for Jenkins)
echo "Installing Java 17..."
apt-get install -y openjdk-17-jdk

# Install essential tools
echo "Installing essential tools..."
apt-get install -y \
    wget \
    curl \
    git \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common

# Install Python 3.11 (required for deployment scripts)
echo "Installing Python 3.11..."
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.11 python3.11-venv python3-pip

# Install Docker
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install kubectl
echo "Installing kubectl..."
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list
apt-get update
apt-get install -y kubectl

# Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
apt-get update
apt-get install -y google-cloud-sdk google-cloud-sdk-gke-gcloud-auth-plugin

# Install Jenkins
echo "Installing Jenkins..."
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | tee /etc/apt/sources.list.d/jenkins.list > /dev/null
apt-get update
apt-get install -y jenkins

# Configure Jenkins user permissions
echo "Configuring Jenkins user permissions..."
usermod -aG docker jenkins

# Create directory for service account keys
echo "Creating keys directory..."
mkdir -p /var/lib/jenkins/keys
chown -R jenkins:jenkins /var/lib/jenkins/keys
chmod 700 /var/lib/jenkins/keys

# Start and enable services
echo "Starting services..."
systemctl daemon-reload
systemctl enable docker
systemctl start docker
systemctl enable jenkins
systemctl start jenkins

# Wait for Jenkins to start
echo "Waiting for Jenkins to start..."
sleep 30

# Display Jenkins initial admin password
echo "=== Jenkins Setup Complete ==="
echo "Jenkins Initial Admin Password:"
cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo "Password file not yet available. Run: sudo cat /var/lib/jenkins/secrets/initialAdminPassword"

echo ""
echo "=== Installation Summary ==="
echo "Java version: $(java -version 2>&1 | head -n 1)"
echo "Python version: $(python3.11 --version)"
echo "Docker version: $(docker --version)"
echo "kubectl version: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
echo "gcloud version: $(gcloud --version | head -n 1)"
echo "Jenkins status: $(systemctl is-active jenkins)"
echo ""
echo "Access Jenkins at: http://<EXTERNAL_IP>:8080"
