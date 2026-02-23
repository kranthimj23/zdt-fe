import subprocess
import sys
import os
import tempfile

from git_helpers import (
    inject_git_token,
    clone_single_branch_and_checkout,
)
 
 
def deploy_service(text_file, env, env_namespace):
    
    with open(text_file, 'r') as file:
        first_col_values = file.readlines()
 
    for items in first_col_values:
        service = items.strip()
        env_namespace = env_namespace.strip()
 
        command = f"helm upgrade --install {service} helm-charts -f helm-charts/{env}-values/app-values/{service}.yaml -n {env_namespace}"
 
        result = subprocess.run(command, shell=True, check=True)
 
 
def main():
    if len(sys.argv) < 4:
        print("Usage: python deploy_script.py <env> <namespace> <repo_url>")
        sys.exit(1)
 
    env_name = sys.argv[1]
    namespace = sys.argv[1]
    repo_url = sys.argv[2]
    branch = sys.argv[3]
 
    repo_url = inject_git_token(repo_url)
 
 
    if not env_name:
        print("Error: ENV is not set.")
        sys.exit(1)
 
    if not namespace:
        print("Error: Namespace is not set.")
        sys.exit(1)
 
    # Create a temporary directory which is auto-deleted
    with tempfile.TemporaryDirectory() as tmpdir:
        # Clone the repo in tmpdir
        clone_single_branch_and_checkout(repo_url, branch, tmpdir)
 
        # Construct path to the environment-specific text file inside cloned repo
        text_file_path = os.path.join(tmpdir, f"helm-charts/{env_name}-values/app-values/{env_name}.txt")
        os.chdir(tmpdir)
        if not os.path.exists(text_file_path):
            print(f"Error: File {text_file_path} does not exist in the cloned repository.")
            sys.exit(1)
 
        # Run deployment
        deploy_service(text_file_path, env_name, namespace)
 
if __name__ == "__main__":
    main()
 
