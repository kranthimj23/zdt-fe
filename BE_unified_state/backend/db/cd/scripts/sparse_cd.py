import sys
import shutil
import subprocess
import os

def clone_and_sparse_checkout(repo_url, sparse_folder, branch_name, txt_file, script_type):
    repo_name = os.path.splitext(os.path.basename(repo_url))[0]
    
    # Clean existing clone
    if os.path.exists(repo_name):
        shutil.rmtree(repo_name)

    # Clone with sparse options
    subprocess.run(["git", "clone", "--filter=blob:none", "--no-checkout", repo_url], check=True)
    os.chdir(repo_name)

    # Initialize sparse-checkout and set the specific folder
    subprocess.run(["git", "sparse-checkout", "init", "--cone"], check=True)
    subprocess.run(["git", "sparse-checkout", "set", sparse_folder], check=True)

    # Checkout the branch
    subprocess.run(["git", "checkout", branch_name], check=True)

    # Run the scripts
    if script_type.upper() == "AQL":
        execute_scripts(sparse_folder, txt_file, "aql")
    elif script_type.upper() == "SQL":
        execute_scripts(sparse_folder, txt_file, "sql")  # Replace 'sql' with actual binary if needed

def execute_scripts(folder, txt_file, command):
    with open(txt_file, 'r') as file:
        for line in file:
            script = line.strip()
            script_path = os.path.join(folder, script)
            print(f"Executing: {command} -f {script_path}")
            subprocess.run([command, "-f", script_path], check=True)

# -------- Main Execution --------

if __name__ == "__main__":
    higher_env = sys.argv[1]      # e.g., "dev2"
    branch_name = sys.argv[2]     # e.g., "main"
    
    repo_url = "https://github.com/kranthimj23/promotion-repo.git"
    
    aql_folder = f"helm-charts/{higher_env}-values/db-scripts/AQL"
    aql_txt = f"{aql_folder}/{higher_env}.txt"

    clone_and_sparse_checkout(repo_url, aql_folder, branch_name, aql_txt, "AQL")
