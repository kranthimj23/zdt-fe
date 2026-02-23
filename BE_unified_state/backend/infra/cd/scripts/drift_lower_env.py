import pandas as pd
import subprocess
import os
import shutil
import sys
 
def load_excel_sheets(file_path):
    """Load all sheets from an Excel file into a dictionary."""
    return pd.read_excel(file_path, sheet_name=None,header=0)  # Load all sheets
 
def create_scaled_resources(df1,df3,sheet_name):
    scaled_resource = []
    all_columns = df1.columns.tolist()
 
    if(len(df1) < len(df3)):
        for i in range(len(df1), len(df3)):
            object_name = df3[all_columns[0]].iloc[i]
            scaled_resource.append({
                'Sheet Name': sheet_name,
                'Object Name': object_name,
                'Field Row': i + 2,
            })
    return scaled_resource
 
def create_whole_resource_diff(df, sheet_name, change_type):
    """
    Create differences for whole resource added or deleted.
 
    Args:
        df (pd.DataFrame): The DataFrame representing the whole resource.
        sheet_name (str): Name of the sheet/resource.
        change_type (str): Either "Added" or "Deleted".
 
    Returns:
        List of dicts representing differences.
    """
    differences = []
 
    for idx, row in df.iterrows():
        object_id = row.get('object_id', None)
        for col in df.columns:
            prev_val = row[col] if change_type == "Deleted" else ""
            curr_val = row[col] if change_type == "Added" else ""
            differences.append({
                'Sheet Name': sheet_name,
                'Object Id': object_id,
                'Field': col,
                'DEV Previous Value': prev_val,
                'DEV Current Value': curr_val,
                'SIT Current Value': None,
                'SIT Value': None,
                'Change': change_type
            })
    return differences
 
 
def compare_dataframes(df1, df2, df3, sheet_name,henv,lenv):
    """Compare two DataFrames and return differences."""
    differences = []
 
    all_columns = set(df1.columns).union(set(df2.columns))
    all_columns.discard('object_id')
    all_columns.discard('object_id_1')
 
    # Convert to list and optionally sort or keep as is
    middle_columns = sorted(all_columns)  # or list(all_columns) for no sorting
 
    # Construct final ordered list
    ordered_columns = ['object_id'] + middle_columns + ['object_id_1']
 
 
    for col in ordered_columns:
        # print(col)
        # Compare values in the current column for all rows
        max_rows = max(len(df1), len(df2),len(df3))
        for index in range(max_rows):
           
 
            object_id = df1["object_id"].iloc[index] if index < len(df1) else None
            object_id2 = df2["object_id"].iloc[index] if index < len(df2) else None
            object_id3 = df3["object_id"].iloc[index] if index < len(df3)  else None
            val1 = df1[col].iloc[index] if index < len(df1) and col in df1.columns else None
            val2 = df2[col].iloc[index] if index < len(df2) and col in df2.columns else None
            val3 = df3[col].iloc[index] if index < len(df3) and col in df3.columns else None
            if object_id is None:
                object_id = object_id2
                val2 =  df2[col].iloc[index] if index < len(df2) and col in df2.columns else None
            if(object_id != object_id2):
                val2 = None
                for ind in range(max_rows):
                    obj_id = df2["object_id"].iloc[ind] if max_rows == len(df2) and col in df2.columns else None
                    if(object_id == obj_id):
                        val2 =  df2[col].iloc[ind] if index < len(df2) and col in df2.columns else None
                        break
 
            if(object_id != object_id3):
                val3 = None
                # print(object_id)
                # print(object_id3)
                # print(col)
                # if(object_id == 4):
                    # print(object_id3)
                for ind in range(max_rows):
                    obj_id = df3["object_id"].iloc[ind] if ind < len(df3) else None
                    # print(obj_id)
                    # if(object_id == 4):
                        # print(obj_id)
                    if(object_id == obj_id):
 
                        val3 =  df3[col].iloc[ind] if ind < len(df3) else None
                        break
                        # print(val3)                
            
         
            if pd.isna(val1):
                val1 = None
            if pd.isna(val2):
                val2 = None
            if pd.isna(val3):
                val3 = None
            
            
            if val1 is not None and val2 is not None :
                if val1 != val2:
                    # print(val1)
                    # print(val2)
                    differences.append({
                    'Sheet Name': sheet_name,
                    'Object Id': object_id,   # Adding 2 to account for header and zero-based index
                    'Field': col,  # Column name as Field
                    # 'Field Row': index + 2,
                    f'{lenv} Previous Value': val1 if val1 is not None else "",
                    f'{lenv} Current Value': val2 if val2 is not None else "",
                    f'{henv} Current Value': val3 if val3 is not None else "",
                    f'{henv} Value': None,  # Placeholder for DR Value
                    'Change': 'Modified'
                })
            elif val1 is not None and val2 is None:
                differences.append({
                'Sheet Name': sheet_name,
                'Object Id': object_id,   # Adding 2 to account for header and zero-based index
                'Field': col,  # Column name as Field
                # 'Field Row': index + 2,  # Adding 2 to account for header and zero-based index
                f'{lenv} Previous Value': val1,
                f'{lenv} Current Value': "",
                f'{henv} Current Value': val3 if val3 is not None else "",
                f'{henv} Value': None,  # Placeholder for DR Value
                'Change': 'Deleted'
            })
            elif val1 is None and val2 is not None:
                differences.append({
                'Sheet Name': sheet_name,
                'Object Id': object_id,   # Adding 2 to account for header and zero-based index
                'Field': col,  # Column name as Field
                # 'Field Row': index + 2,  # Adding 2 to account for header and zero-based index
                f'{lenv} Previous Value': "",
                f'{lenv} Current Value': val2,
                f'{henv} Current Value': "",
                f'{henv} Value': None,  # Placeholder for DR Value
                'Change': 'Added'
            })
    return differences
 
# def save_to_excel(differences,scaled_resources ,output_file):
#     """Save the differences to an Excel file."""
#     df = pd.DataFrame(differences)
#     dff =pd.DataFrame(scaled_resources)
#     df.to_excel(output_file, index=False, engine='openpyxl',sheet_name="differences")
#     dff.to_excel(output_file,index=False, engine='openpyxl',sheet_name="scaled_resources")
 
 

def save_to_excel(differences, scaled_resources, output_file):
    """Save the differences and scaled resources to an Excel file."""

    # Ensure directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    df = pd.DataFrame(differences)
    dff = pd.DataFrame(scaled_resources)

    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name="differences", index=False)
        dff.to_excel(writer, sheet_name="scaled_resources", index=False)
 
def clone_repo(repo_url, branch_name, target_folder):
    try:
        if os.path.exists(target_folder):
            shutil.rmtree(target_folder)
        os.makedirs(target_folder)  # Create the target folder
    except Exception as e:
        print(f"Error creating folder '{target_folder}': {e}")
        return
    # Clone the specified branch into the target folder
     
    github_token = os.getenv("GIT_TOKEN")
    if github_token and "github.com" in repo_url:
        # Inject token into repo URL (safe for HTTPS GitHub URLs)
        if repo_url.startswith("https://"):
            repo_url = repo_url.replace("https://", f"https://{github_token}@")
        else:
            raise ValueError("Unsupported repo_url format. Must start with https://")
    try:
        subprocess.run(
            ["git", "clone", "--branch", branch_name, repo_url, target_folder],
            check=True
        )
        print(f"Successfully cloned '{branch_name}' branch into '{target_folder}'.")
    except subprocess.CalledProcessError as e:
        print(f"Error cloning the repository: {e}")
 
 
def copy_contents(src_folder, dst_folder):
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)
    for item in os.listdir(src_folder):
        s = os.path.join(src_folder, item)
        d = os.path.join(dst_folder, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    
   
 
def main():
 
    repo_url =  sys.argv[1]  # input("Enter repo url")  # repo url for sys argument 1
    # repo_name = input("")
    promote_branch_x_1 =  sys.argv[2]  #input("Enter the branch containing the stable release: ")   # repo branch x - 1  for sys argument 2
    promote_branch_x =  sys.argv[3]  # input("Enter the branch containing the updated files for release: ") # repo branch x   for sys argument 3
    lenv =  sys.argv[4]  # input("enter lower env name") # repo lower env for sys argument 4
    henv =  sys.argv[5]  # input("enter higher env name") # repo higher env for sys argument 5
    target_folder_x_1 = os.path.join(os.getcwd(),"promo_x_1")
    target_folder_x = os.path.join(os.getcwd(),"promo_x")
 
     # To Clone the repo from promotion-x-1 branch
    clone_repo(repo_url, promote_branch_x_1, target_folder_x_1)
    # To Clone the repo from promotion-x branch
    clone_repo(repo_url, promote_branch_x, target_folder_x)
 
 
    input_excel_1 = os.path.join(target_folder_x_1, "helm-charts", f"{lenv}-values", "infra-values", "dataset", "infra_sheet.xlsx")
    input_excel_2 = os.path.join(target_folder_x,   "helm-charts", f"{lenv}-values", "infra-values", "dataset", "infra_sheet.xlsx")
    input_excel_3 = os.path.join(target_folder_x_1, "helm-charts", f"{henv}-values", "infra-values", "dataset", "infra_sheet.xlsx")

    x_1infra_folder = os.path.join(target_folder_x_1, "helm-charts", f"{henv}-values", "infra-values")
    x_infra_folder  = os.path.join(target_folder_x,   "helm-charts", f"{henv}-values", "infra-values")
 
    print("Copying from:", x_infra_folder)
    print("Copying to:", x_1infra_folder)
    copy_contents(x_1infra_folder, x_infra_folder)


    # output_file = f'{target_folder_x}\helm-charts\{henv}-values\infra-values/releaseno\infra_difference.xlsx'  # Specify output path
 
    output_file = os.path.join(f"{target_folder_x}", "helm-charts", f"{henv}-values", "infra-values", "release_note", "infra_difference.xlsx")
 
 
 
    # Load all sheets from both Excel files
    sheets_1 = load_excel_sheets(input_excel_1)
    sheets_2 = load_excel_sheets(input_excel_2)
    sheets_3 = load_excel_sheets(input_excel_3)
 
    differences = []
    scaled_resources = []
 
    # Compare sheets with the same names
    common_sheet_names = set(sheets_1.keys()).union(set(sheets_2.keys()))
    
    for sheet_name in common_sheet_names:
        
        in_sheet1 = sheet_name in sheets_1
        in_sheet2 = sheet_name in sheets_2
        if in_sheet1 and in_sheet2:
            df1 = sheets_1[sheet_name]
            df2 = sheets_2[sheet_name]
            df3 = sheets_3[sheet_name]
            
            # Compare the two DataFrames and gather differences
            diff = compare_dataframes(df1, df2,df3, sheet_name,henv,lenv)
            sr = create_scaled_resources(df1,df3,sheet_name)
            scaled_resources.extend(sr)
            differences.extend(diff)
        
        elif in_sheet1 and not in_sheet2:
            # Whole resource deleted
            df1 = sheets_1[sheet_name]
            diff = create_whole_resource_diff(df1, sheet_name, "Deleted")
            differences.extend(diff)
 
        elif in_sheet2 and not in_sheet1:
            # Whole resource added
            df2 = sheets_2[sheet_name]
            diff = create_whole_resource_diff(df2, sheet_name, "Added")
            differences.extend(diff) # added whole reource
 
 
    # Save the differences to an Excel file
    print(output_file)
    
    save_to_excel(differences,scaled_resources , output_file)
    
    print(f"Differences saved to {output_file}")
 
 
    ##commit and push x folder
    try:
        subprocess.run(['git', 'add', "."], cwd =target_folder_x, check=True, capture_output=True, text=True)
        status_result = subprocess.run(['git', 'status'], cwd =target_folder_x, check=True, capture_output=True, text=True)
        print(status_result.stdout)
        print(status_result.stderr)
        # Pull latest changes with rebase to avoid non-fast-forward errors
        subprocess.run(['git', 'config', 'user.email', 'kranthimj23@gmail.com'], cwd =target_folder_x ,check=True, timeout=30)
        subprocess.run(['git', 'config', 'user.name', 'kranthimj23'], cwd =target_folder_x, check=True, timeout=30)
        subprocess.run(['git', 'commit', '-m',
                    f'Pushing the release_note into the branch: {promote_branch_x} {henv}  '], cwd =target_folder_x, check=True, capture_output=True, text=True)
        # subprocess.run(['git', 'pull', '--rebase', 'origin', sys.argv[2]], cwd=target_folder_x, check=True, capture_output=True, text=True)
        # print("Pulled latest changes successfully.")
        # Push changes
        push_result = subprocess.run(['git', 'push', 'origin', promote_branch_x], cwd=target_folder_x, check=True, capture_output=True, text=True)
        print("Push successful:")
        print(push_result.stdout)
    except subprocess.CalledProcessError as e:
        print("Git command failed!")
        print("Return code:", e.returncode)
        print("Command:", e.cmd)
        print("Output:", e.output)
        print("Error:", e.stderr)
        sys.exit(1)

    shutil.rmtree(target_folder_x_1, ignore_errors=True)
    shutil.rmtree(target_folder_x, ignore_errors=True)
 
if __name__ == "__main__":
    main()
 
