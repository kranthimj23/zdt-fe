import sys
import shutil
import os

from utilities.git_helpers import (
    clone_repo_and_checkout,
    clone_branch_and_checkout_new_branch,
    stage_commit_and_push,
    is_base_branch_exists
)

from utilities.helpers import tokenize_url

from utilities.dir_helpers import (
    make_dir, 
    clean_non_dev_folders,
    on_rm_error
)
from utilities.excel_helpers import (
    find_column_index, 
    create_new_branch,
    find_branch,
    get_sheet,
    create_new_drop_in_meta_sheet,
    pick_branch
)
 
def fetch_branches(file_path, lower_env, update_lower_env, new_branch_created, higher_env, new_version = None, promoting = None, branch_to_pick = None):
    sheet = get_sheet(file_path)
 
    lower_col = find_column_index(sheet, lower_env)
    higher_col = find_column_index(sheet, higher_env)

    #hotfix short-circuit
    if branch_to_pick:
        new_branch_created = True
        lower_branch, _ = pick_branch(sheet, lower_col, branch_to_pick = branch_to_pick)
        higher_branch = lower_branch
        new_branch = create_new_branch(lower_branch, new_version)
        create_new_drop_in_meta_sheet(file_path, sheet, lower_env, new_branch)
        return lower_branch, new_branch, update_lower_env, new_branch_created

    if promoting:
        target = f"release/{new_version}"
        lower_branch, _ = find_branch(sheet, lower_col, promoting, target)
    else:
        lower_branch, _ = find_branch(sheet, lower_col)
    higher_branch, _ = find_branch(sheet, higher_col)
 
    if lower_branch.strip() == higher_branch.strip():
        new_branch = create_new_branch(new_version)
        if lower_env in ['dev', 'dev1', 'dev2']:
            new_branch_created = True
            create_new_drop_in_meta_sheet(file_path, sheet, lower_env, new_branch)
        else:
            update_lower_env = True
            create_new_drop_in_meta_sheet(file_path, sheet, 'dev1', new_branch)
        return lower_branch, new_branch, update_lower_env, new_branch_created       
    else:
        return higher_branch, lower_branch, update_lower_env, new_branch_created

 
def create_github_branch(github_url, base_branch, new_branch, lower_env, temp_dir):
    try:
        if is_base_branch_exists(github_url, base_branch):
            new_branch_dir = make_dir(parent_dir=temp_dir, dir_name='new_branch')
            clone_branch_and_checkout_new_branch(github_url, base_branch, new_branch_dir, new_branch)
            clean_non_dev_folders(new_branch_dir)

            commit_message = f'Initialize {new_branch}: Clean  environment folders'
            stage_commit_and_push(github_url, new_branch_dir, new_branch, commit_message)
        else:
            raise ValueError(f"Base branch '{base_branch}' not found in repository")
    except Exception as e:
        print(e)
        raise
 
def main():
    lower_env = sys.argv[1]
    higher_env = sys.argv[2]
    github_url = sys.argv[3]
    new_version = sys.argv[4]
    branch_to_pick = sys.argv[5] if len(sys.argv) > 5 else None

    update_lower_env = False
    reverse_promotion = False
    new_branch_created = False
    promoting = False

    try:
        github_url = tokenize_url(github_url)
    except Exception as e:
        print(f"Logging error: {e}")
        raise
    
    temp_folder = make_dir()
    master_dir = make_dir(temp_folder, 'master')

    clone_repo_and_checkout(github_url, "master", master_dir)
    meta_sheet_file_path = os.path.join(master_dir, f"meta-sheet.xlsx")
    
    # if lower_env != 'dev1' and lower_env != 'dev2':
    if lower_env != 'dev':
        promoting = True
    
    prev_branch, present_branch, update_lower_env, new_branch_created = fetch_branches(meta_sheet_file_path, lower_env, update_lower_env, new_branch_created, higher_env, new_version, promoting, branch_to_pick)

    if new_branch_created:
        create_github_branch(github_url, prev_branch, present_branch, lower_env, temp_folder)
        commit_message = f'Add {present_branch} to meta-sheet'
        stage_commit_and_push(github_url, master_dir, 'master', commit_message)

    envs = []
 
    if update_lower_env:
        envs.append('dev1')
        envs.append(lower_env)
        reverse_promotion = True
    else:
        envs.append(lower_env)
        envs.append(higher_env)

    shutil.rmtree('temp', onerror=on_rm_error)
    x1 = prev_branch
    x2 = present_branch
    low = envs[0]
    high = envs[1]
    isNew = new_branch_created
    print(f"{x1}, {x2}, {low}, {high}, {isNew}")
 
if __name__ == "__main__":
    main()