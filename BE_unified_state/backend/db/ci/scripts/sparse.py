import subprocess
import shutil
import os
 
def clone_and_sparse_checkout(repo_url, target_folder, specific_folder, branch_name, txt_file, type):
    # Clone the repository
    clone_command = f"git clone --filter=blob:none --no-checkout {repo_url}"
    subprocess.run(clone_command, shell=True)
 
    # Change into the cloned repository directory
    os.chdir(target_folder)
 
    # Enable sparse checkout
    sparse_checkout_command = "git sparse-checkout set --cone"
    subprocess.run(sparse_checkout_command, shell=True)
 
        # Set the specific folder for sparse checkout
    sparse_checkout_set_command = f"git checkout {branch_name}"
    subprocess.run(sparse_checkout_set_command, shell=True)
 
    # Set the specific folder for sparse checkout
    sparse_checkout_set_command = f"git sparse-checkout set {specific_folder}"
    subprocess.run(sparse_checkout_set_command, shell=True)
    if type == "AQL":
        execute_scripts(specific_folder, txt_file, "aql")
    if type == "SQL":
        execute_scripts(specific_folder, txt_file, "./")
 
 
def execute_scripts(folder, txt_file, type):
    with open(txt_file, 'r') as file:
 
        for i in file:
            i = i.strip()
            file_path = os. path.join(folder, i)
            print(file_path)
            subprocess.run([f"{type}","-f", file_path],check=True)
 
# Example usage
repo_url = r"https://github.com/kranthimj23/aerospike-app.git"
target_folder = r"aerospike-app"
if os.path.exists(target_folder):
    shutil.rmtree(target_folder)
else:
    os.makedirs(target_folder)
aql_specific_folder = r"AQL/scripts"
aql_txt_file = r"AQL/scripts/dev.txt"
#sql_specific_folder = r"helm-charts/dev2-values/db-scripts/SQL"
#sql_txt_file = r"helm-charts/dev2-values/db-scripts/SQL/sit2.txt"
branch_name = "dev"
 
clone_and_sparse_checkout(repo_url, target_folder, aql_specific_folder, branch_name, aql_txt_file, "AQL")
#clone_and_sparse_checkout(repo_url, target_folder, sql_specific_folder, branch_name, sql_txt_file, "SQL"
