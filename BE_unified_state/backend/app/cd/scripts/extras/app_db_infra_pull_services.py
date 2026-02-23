import os
import stat
import shutil
import subprocess
from pathlib import Path
import tempfile
import sys

from git_helpers import (
    run_git_command,
    configure_git_user,
    stage_commit_and_push,
)
 
# ------------------ CONFIGURATION ------------------ #
app_raw_list = os.getenv('app-repo-list', '')
app_repo_list = [item.strip() for item in app_raw_list.split('\n') if item.strip()]
print("Parsed list:", app_repo_list)
 
aql_db_raw_list = os.getenv('aql-db-repo-list', '')
aql_db_repo_list = [item.strip() for item in aql_db_raw_list.split('\n') if item.strip()]
print("Parsed list:", aql_db_repo_list)
 
sql_db_raw_list = os.getenv('sql-db-repo-list', '')
sql_db_repo_list = [item.strip() for item in sql_db_raw_list.split('\n') if item.strip()]
print("Parsed list:", sql_db_repo_list)
 
infra_raw_list = os.getenv('infra-repo-list', '')
infra_repo_list = [item.strip() for item in infra_raw_list.split('\n') if item.strip()]
print("Parsed list:", infra_repo_list)
 
promotion_repo = "https://github.qwerty.com/qwerty/promo-helm-charts.git"
target_branch = sys.argv[1]
temp_dir = tempfile.mkdtemp()
 
source_app_relative_path = os.path.join("helm-charts", "dev-values", "app-values")
source_aql_relative_path = os.path.join("helm-charts", "dev-values", "db-scripts", "AQL")
source_sql_relative_path = os.path.join("helm-charts", "dev-values", "db-scripts", "SQL")
 
destination_app_relative_path = os.path.join("helm-charts", "dev2-values", "app-values")
destination_aql_relative_path = os.path.join("helm-charts", "dev2-values", "db-scripts", "AQL")
destination_sql_relative_path = os.path.join("helm-charts", "dev2-values", "db-scripts", "SQL")
destination_infra_relative_path = os.path.join("helm-charts", "dev2-values", "infra-values")
 
# ---------------------- FUNCTIONS ----------------------------- #
 
def prepare_promotion_repo(promotion_repo_url, workspace, branch):
    promo_repo_path = os.path.join(workspace, "promotion")
    try:
        print(f"🧬 Cloning promotion repo: {promotion_repo_url}")
        run_git_command(f"git clone {promotion_repo_url} promotion", cwd=workspace)
 
        remote_branches = run_git_command("git branch -r", cwd=promo_repo_path)
        print(f"Remote branches:\n{remote_branches}")
 
        if f"origin/{branch}" in remote_branches:
            print(f"Branch '{branch}' found. Checking it out.")
            run_git_command(f"git checkout {branch}", cwd=promo_repo_path)
        else:
            print(f"Branch '{branch}' not found. Creating from 'origin/main'.")
            run_git_command(f"git checkout -b {branch} origin/main", cwd=promo_repo_path)
 
        return promo_repo_path
    except subprocess.CalledProcessError as e:
        print(f"Error in prepare_promotion_repo: {e}\nOutput: {e.output}\nStderr: {e.stderr}")
        raise
 
def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)
 
def main():
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
 
    collected_files = []
    collected_aql_files = []
    collected_sql_files = []
    collected_infra_files = []
 
    for repo in app_repo_list:
        try:
            repo_name = Path(repo).stem
            repo_path = os.path.join(temp_dir, repo_name)
            # Clone repo once
            run_git_command(f"git clone --branch main {repo}", cwd=temp_dir)
 
            # Collect YAML files
            source_path = os.path.join(repo_path, source_app_relative_path)
            print("Ssssooouurrccee", source_path)
            yaml_files = []
            if os.path.exists(source_path):
                yaml_files = [(f.name, f.read_text()) for f in Path(source_path).glob("*.yaml")]
            collected_files.extend(yaml_files)
            print(f"Fetched {len(yaml_files)} yaml files from {repo}")
 
        except Exception as e:
            print(f"Failed to fetch from {repo}: {e}")
 
 
    for repo in aql_db_repo_list:
        try:
            repo_name = Path(repo).stem
            repo_path = os.path.join(temp_dir, repo_name)
            # Clone repo once
            run_git_command(f"git clone --branch main {repo}", cwd=temp_dir)
 
            # Collect AQL files
            source_path_aql = os.path.join(repo_path, source_aql_relative_path)
            aql_files = []
            if os.path.exists(source_path_aql):
                aql_files = [(f.name, f.read_text()) for f in Path(source_path_aql).glob("*.aql")]
            collected_aql_files.extend(aql_files)
            print(f"Fetched {len(aql_files)} aql files from {repo}")
 
        except Exception as e:
            print(f"Failed to fetch from {repo}: {e}")
 
    for repo in sql_db_repo_list:
        try:
            repo_name = Path(repo).stem
            repo_path = os.path.join(temp_dir, repo_name)
            # Clone repo once
            run_git_command(f"git clone --branch main {repo}", cwd=temp_dir)
 
            # Collect SQL files
            source_path_sql = os.path.join(repo_path, source_sql_relative_path)
            sql_files = []
            if os.path.exists(source_path_sql):
                sql_files = [(f.name, f.read_text()) for f in Path(source_path_sql).glob("*.sql")]
            collected_sql_files.extend(sql_files)
            print(f"Fetched {len(sql_files)} sql files from {repo}")
           
 
        except Exception as e:
            print(f"Failed to fetch from {repo}: {e}")
 
    for repo in infra_repo_list:
        try:
            repo_name = Path(repo).stem
            repo_path = os.path.join(temp_dir, repo_name)
            # Clone repo once
            run_git_command(f"git clone --branch main {repo}", cwd=temp_dir)
          
            # Collect Infra files
            # source_path_infra = os.path.join(repo_path, source_infra_relative_path)
            source_path_infra = repo_path
            infra_files = []
            if os.path.exists(source_path_infra):
                base_path = Path(source_path_infra)
                for file in base_path.rglob("*"):
                    if file.is_file():
                        relative_path = file.relative_to(base_path)  # preserves folder structure
                        content = file.read_text(encoding="utf-8")
                        infra_files.append((str(relative_path), content))
 
 
            collected_infra_files.extend(infra_files)
            print(f"Fetched {len(infra_files)} files from {repo}")
 
 
        except Exception as e:
            print(f"Failed to fetch from {repo}: {e}")
 
 
 
    try:
        promo_repo_path = prepare_promotion_repo(promotion_repo, temp_dir, target_branch)
 
        destination_path = os.path.join(promo_repo_path, destination_app_relative_path)
        destination_aql_path = os.path.join(promo_repo_path, destination_aql_relative_path)
        destination_sql_path = os.path.join(promo_repo_path, destination_sql_relative_path)
        destination_infra_path = os.path.join(promo_repo_path, destination_infra_relative_path)
 
        os.makedirs(destination_path, exist_ok=True)
        os.makedirs(destination_aql_path, exist_ok=True)
        os.makedirs(destination_sql_path, exist_ok=True)
        os.makedirs(destination_infra_path, exist_ok=True)
 
        # Write YAML files
        for file_name, content in collected_files:
            dest_file_path = os.path.join(destination_path, file_name)
            with open(dest_file_path, 'x') as f:
                f.write(content)
 
        # Write AQL files
        for file_name, content in collected_aql_files:
            dest_aql_file_path = os.path.join(destination_aql_path, file_name)
            with open(dest_aql_file_path, 'x') as f:
                f.write(content)
 
        # Write SQL files
        for file_name, content in collected_sql_files:
            dest_sql_file_path = os.path.join(destination_sql_path, file_name)
            with open(dest_sql_file_path, 'x') as f:
                f.write(content)
 
        # Write Infra files
        for file_name, content in collected_infra_files:
            dest_infra_file_path = os.path.join(destination_infra_path, file_name)
            os.makedirs(os.path.dirname(dest_infra_file_path), exist_ok=True)
            with open(dest_infra_file_path, 'x', encoding='utf-8') as f:
                f.write(content)
 
        # Verification
        print("\nVerifying written files in promotion repo...\n")
        for file_name, _ in collected_files:
            dest_file_path = os.path.join(destination_path, file_name)
            if os.path.exists(dest_file_path):
                print(f"Found YAML: {dest_file_path}")
            else:
                print(f"Missing YAML file: {dest_file_path}")
 
        for file_name, _ in collected_aql_files:
            dest_aql_file_path = os.path.join(destination_aql_path, file_name)
            if os.path.exists(dest_aql_file_path):
                print(f"Found AQL: {dest_aql_file_path}")
            else:
                print(f"Missing AQL file: {dest_aql_file_path}")
 
        for file_name, _ in collected_sql_files:
            dest_sql_file_path = os.path.join(destination_sql_path, file_name)
            if os.path.exists(dest_sql_file_path):
                print(f"Found SQL: {dest_sql_file_path}")
            else:
                print(f"Missing SQL file: {dest_sql_file_path}")
 
 
        for file_name, _ in collected_infra_files:
            dest_infra_file_path = os.path.join(destination_infra_path, file_name)
            if os.path.exists(dest_infra_file_path):
                print(f"Found Infra: {dest_infra_file_path}")
            else:
                print(f"Missing Infra file: {dest_infra_file_path}")
               
 
        configure_git_user(promo_repo_path)
        stage_commit_and_push(
            promo_repo_path,
            target_branch,
            'Sync dev2-values from all services',
            pull_before_push=False,
        )
 
        print("Promotion repository updated successfully.")
    except Exception as e:
        print(f"Failed to update promotion repo: {e}")
    finally:
        shutil.rmtree(temp_dir, onerror=remove_readonly)
 
if __name__ == "__main__":
    main()
 