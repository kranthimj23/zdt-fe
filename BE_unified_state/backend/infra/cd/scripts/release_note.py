import pandas as pd
 
def load_excel_sheets(file_path):
    """Load all sheets from an Excel file into a dictionary."""
    return pd.read_excel(file_path, sheet_name=None,header=0)  # Load all sheets
 
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
                'Lower env Previous Value': prev_val,
                'Lower env Current Value': curr_val,
                'Change': change_type
            })
    return differences
 
 
def compare_dataframes(df1, df2, sheet_name):
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
        max_rows = max(len(df1), len(df2))
        for index in range(max_rows):
           
 
            object_id = df1["object_id"].iloc[index] if index < len(df1) else None
            object_id2 = df2["object_id"].iloc[index] if index < len(df2) else None
            val1 = df1[col].iloc[index] if index < len(df1) and col in df1.columns else None
            val2 = df2[col].iloc[index] if index < len(df2) and col in df2.columns else None
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
 
 
            if pd.isna(val1):
                val1 = None
            if pd.isna(val2):
                val2 = None
 
            
            
            if val1 is not None and val2 is not None :
                if val1 != val2:
                    # print(val1)
                    # print(val2)
                    differences.append({
                    'Sheet Name': sheet_name,
                    'Object Id': object_id,   # Adding 2 to account for header and zero-based index
                    'Field': col,  # Column name as Field
                    'Lower env Previous Value': val1 if val1 is not None else "",
                    'Lower env Current Value': val2 if val2 is not None else "",
                    'Change': 'Modified'
                })
            elif val1 is not None and val2 is None:
                differences.append({
                'Sheet Name': sheet_name,
                'Object Id': object_id,   # Adding 2 to account for header and zero-based index
                'Field': col,  # Column name as Field
                'Lower env Previous Value': val1,
                'Lower env Current Value': "",
                'Change': 'Deleted'
            })
            elif val1 is None and val2 is not None:
                differences.append({
                'Sheet Name': sheet_name,
                'Object Id': object_id,   # Adding 2 to account for header and zero-based index
                'Field': col,  # Column name as Field
                'Lower env Previous Value': "",
                'Lower env Current Value': val2,
                'Change': 'Added'
            })
    return differences
 
 
def save_to_excel(differences, scaled_resources, output_file):
    """Save the differences and scaled resources to an Excel file."""
    df = pd.DataFrame(differences)
    dff = pd.DataFrame(scaled_resources)
    
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name="differences", index=False)
        dff.to_excel(writer, sheet_name="scaled_resources", index=False)
def main():
    input_excel_1 = '/Users/m26395/Downloads/AWS_Infra_Environment (5).xlsx'   # x-1 state sheet path
    input_excel_2 = '/Users/m26395/Downloads/AWS_Infra_Envi_X_state - Copy 1 (1).xlsx' # x state sheet path
    output_file = '/Users/m26395/Documents/promo-helm-charts/zdt-cicd-module/scripts/differences.xlsx'  # Specify output path
 
    # Load all sheets from both Excel files
    sheets_1 = load_excel_sheets(input_excel_1)
    sheets_2 = load_excel_sheets(input_excel_2)
    # sheets_3 = load_excel_sheets(input_excel_3)
 
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
            # df3 = sheets_3[sheet_name]
            
            # Compare the two DataFrames and gather differences
            diff = compare_dataframes(df1, df2, sheet_name)
            # sr = create_scaled_resources(df1,sheet_name)
            # scaled_resources.extend(sr)
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
    save_to_excel(differences,scaled_resources , output_file,)
    print(f"Differences saved to {output_file}")
 
if __name__ == "__main__":
    main()
 
 