import os
import sys
import shutil
import subprocess
from pathlib import Path

from utilities.helpers import tokenize_url

from utilities.dir_helpers import (
    make_dir,
    isDirClean,
    on_rm_error
)
from utilities.git_helpers import (
    clone_repo_and_checkout,
    stage_commit_and_push
)

def write_and_verify(destination_folder, collected_files):
    missing_file_count = {'count': 0, 'fileName':[]}
    found_file_count = 0
    for file_name, content in collected_files:
        dest_file_path = os.path.join(destination_folder, file_name)
        with open(dest_file_path, 'x') as f:
            f.write(content)

    print("\nVerifying written files in promotion repo...\n")
    for file_name, _ in collected_files:
        dest_file_path = os.path.join(destination_folder, file_name)
        if os.path.exists(dest_file_path):
            found_file_count += 1
        else:
            missing_file_count["count"] += 1
            missing_file_count["fileName"].append(file_name)
            # print(f"Missing YAML file: {dest_file_path}")
    print("Verification Completed!")
    print(f"Found {found_file_count} written files")
    if missing_file_count["count"] != 0:
        print(f"Found {missing_file_count['count']} missing")
        print(f"List of missing file: {missing_file_count['fileName']}.")


def prepare_promotion_repo(promotion_repo_url, workspace, branch):
    promo_repo_path = make_dir(workspace, "promotion")

    try:
        print(f"Cloning promotion repo: {promotion_repo_url}")
        try:
            clone_repo_and_checkout(promotion_repo_url, branch, promo_repo_path)
            print(f"Branch '{branch}' ready!")
            return promo_repo_path
        except subprocess.CalledProcessError as e:
            print(f"Branch '{branch}' not found. Creating from mb-baseline")
            if isDirClean(promo_repo_path):
                clone_repo_and_checkout(promotion_repo_url, "mb-baseline", promo_repo_path)
    except Exception as e:
        print(f"Error: {e}")
        raise

def collect_yaml_files_from_repo(url, working_dir, relative_path, yaml_files):
    repo_name = Path(url).stem
    repo_path = make_dir(working_dir, repo_name)

    clone_repo_and_checkout(url, 'main', repo_path)

    source_path = os.path.join(repo_path, relative_path)
    print("Ssssooouurrccee", source_path)

    if os.path.exists(source_path):
        yaml_files = [(f.name, f.read_text()) for f in Path(source_path).glob("*.yaml")]

    print(f"Fetched {len(yaml_files)} yaml files from {url}")
    return yaml_files

def main():
    promotion_repo_url = sys.argv[1]
    promotion_repo_url = tokenize_url(promotion_repo_url)
    
    target_branch = sys.argv[2]
    lower_env = sys.argv[3]
    services_list_file = sys.argv[4]

    source_app_relative_path = os.path.join("helm-charts", "dev-values")
    destination_app_relative_path = os.path.join("helm-charts", f"{lower_env}-values", "app-values")

    # Validate that services_list_file exists
    if not os.path.exists(services_list_file):
        print(f"Error: Services list file '{services_list_file}' not found.")
        sys.exit(1)

    # Read app repositories from file
    try:
        with open(services_list_file, 'r') as f:
            app_repo_list = [line.strip() for line in f.readlines() if line.strip()]
        print(f"Parsed {len(app_repo_list)} repositories from {services_list_file}:")
        for repo in app_repo_list:
            print(f"  - {repo}")
    except Exception as e:
        print(f"Error reading services list file: {e}")
        sys.exit(1)

    if not app_repo_list:
        print("Error: No repositories found in services list file.")
        sys.exit(1)


    temp_dir = make_dir()

    # raw_app_list = os.getenv('app_repo_list', 'https://github.hdfcbank.com/HDFCBANK/mb-helmcharts.git')
    # repo_url_list = [item.strip() for item in raw_app_list.split('\n') if item.strip()]

    collected_files = []

    for repo_url in app_repo_list:
        yaml_files = []
        try:
            repo_url = tokenize_url(repo_url)
            yaml_files = collect_yaml_files_from_repo(repo_url, temp_dir, source_app_relative_path, yaml_files)
            collected_files.extend(yaml_files)
        except Exception as e:
            print(f"Failed to fetch from {repo_url}: {e}")

    try:
        promo_repo_path = prepare_promotion_repo(promotion_repo_url, temp_dir, target_branch)
        destination_folder = make_dir(promo_repo_path, destination_app_relative_path)
        write_and_verify(destination_folder, collected_files)

        commit_message = "Sync dev1-values from all services"
        stage_commit_and_push(promotion_repo_url, promo_repo_path, target_branch, commit_message)
        print("Promotion repository updated successfully.")
    except Exception as e:
        print(f"Failed to update promotion repo: {e}")
    finally:
        shutil.rmtree(temp_dir, onerror=on_rm_error)

if __name__ == "__main__":
    main()