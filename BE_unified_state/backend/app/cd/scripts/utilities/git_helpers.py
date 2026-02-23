import subprocess

from utilities.dir_helpers import isDirClean


def is_base_branch_exists(url, branch):
    ls_remote = subprocess.run(['git', 'ls-remote', '--heads', url, branch], capture_output=True, text=True, check=True)
    if ls_remote:
        return True
    else:
        return False
    
def clone_single_branch_and_checkout(url, checkout_branch, clone_dir):
    if isDirClean(clone_dir):
        try:
            subprocess.run(
                ['git', 'clone', '--single-branch', '-b', checkout_branch, url, clone_dir],
                check=True,timeout = 30, 
                stdout=subprocess.DEVNULL
            )
        except Exception as e:
            print(f"Error occured while cloning and checking out: {e}")
            raise

def clone_branch_and_checkout_new_branch(url, checkout_branch, clone_dir, new_branch):
    if isDirClean(clone_dir):
        try:
            subprocess.run(
                ['git', 'clone', '--single-branch', '-b', checkout_branch, url, clone_dir],
                check=True,timeout = 30, 
                stdout=subprocess.DEVNULL
            )
            subprocess.run(['git', 'checkout', '-b', new_branch], cwd=clone_dir, check=True, timeout=30)
        except Exception as e:
            print(f"Error occured while cloning and checking out: {e}")
            raise

def clone_repo_and_checkout(url, checkout_branch, clone_dir):
    if isDirClean(clone_dir):
        try:
            subprocess.run(
                ["git", "clone", "-b", checkout_branch, url, clone_dir],
                check=True,
                stdout=subprocess.DEVNULL 
            )
        except Exception as e:
            print(f"Error occured while cloning and checking out: {e}")
            raise

def stage_commit_and_push(url, push_dir, to_branch, commit_message, rebase=False):
    try:
        subprocess.run(['git', 'add', '.'], cwd=push_dir, check=True, timeout=30)
        subprocess.run(['git', 'commit', '-m', commit_message], cwd=push_dir, check=True, timeout=30, stdout=subprocess.DEVNULL)
        subprocess.run(['git', 'remote', 'set-url', 'origin', url], cwd=push_dir, check=True)
        if rebase:
            subprocess.run(['git', 'pull', '--rebase', 'origin', to_branch], cwd=push_dir, check=True, timeout=30)
        subprocess.run(['git', 'push', 'origin', to_branch], cwd=push_dir, check=True, timeout=30)
    except subprocess.CalledProcessError as e:
        if e.cmd and 'git' in ' '.join(e.cmd).lower():
            cmd_name = ' '.join(e.cmd[-2:])
            if 'commit' in cmd_name:
                print("No changes to commit - files haven't changed")
            elif 'push' in cmd_name:
                print(f"Push failed: {e.stderr or 'Remote rejected changes'}")
                print(f"   Branch: {to_branch}, Remote: {url}")
            elif 'add' in cmd_name:
                print("Git add failed - check if files exist in directory")
            else:
                print(f"Git command failed: {cmd_name}")
                print(f"   Error: {e.stderr or e.output or 'Unknown error'}")
        else:
            print(f"Subprocess error: {e}")
        return False