import os
import stat
import shutil

def make_dir(parent_dir = None, dir_name = 'temp'):
    temp_folder = os.path.join(os.getcwd(), parent_dir if parent_dir else "", dir_name)
    os.makedirs(temp_folder, exist_ok=True)
    return temp_folder

def on_rm_error(func, path, exc_info):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def isDirClean(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory)
        return True
    
def clean_non_dev_folders(temp_dir):
    """Remove all files in environment folders"""
    env_folders = []
    for folder in os.listdir(temp_dir):
        item_path = os.path.join(temp_dir, f"helm-charts")
        if folder == "helm-charts":
            for i in os.listdir(item_path):
                if i.endswith('values'):
                    env_folders.append(i)
                    env_path = os.path.join(item_path, i)
 
                    if os.path.exists(env_path):
 
                        # Remove all files while preserving directory structure
                        for root, dirs, files in os.walk(env_path):
                            for file in files:
                                file_path = os.path.join(root, file)
                                os.remove(file_path)
                                readme_path = os.path.join(root, "readme.md")
                                with open(readme_path, 'w') as f:
                                    f.write(f"The files of {env_path} are stored here")

