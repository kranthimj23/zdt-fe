import os
import re
import json
import pandas as pd
import hcl2
import subprocess
import shutil
import sys
 
# Constants
# TEMPLATE_FOLDER = r'/Users/m26395/Downloads/promo-helm-charts/zdt-infrastructure/templates' # Folder containing all template files
 
def clone_repo(repo_url, branch_name, target_folder):
    try:
        if os.path.exists(target_folder):
            shutil.rmtree(target_folder)
        os.makedirs(target_folder)  # Create the target folder
    except Exception as e:
        print(f"Error creating folder '{target_folder}': {e}")
        return
    # Clone the specified branch into the target folder
    try:
        subprocess.run(
            ["git", "clone", "--branch", branch_name, repo_url, target_folder],
            check=True
        )
        print(f"Successfully cloned '{branch_name}' branch into '{target_folder}'.")
    except subprocess.CalledProcessError as e:
        print(f"Error cloning the repository: {e}")
     # Output file
 
# Function to load templates dynamically
def load_templates(template_folder):
    """
    Load all template files from the specified folder.
    Returns a dictionary with filenames as keys and file content as values.
    """
    templates = {}
    for file_name in os.listdir(template_folder):
            # print(file_name)
            with open(os.path.join(template_folder, file_name), "r",encoding='utf-8') as file:
                templates[file_name.split(".")[0]] = file.read()
    return templates
 
def create_threshold(template,threshold_data,alert_name):
    content = ""
    for record in threshold_data:
        if record["alert_name"] == alert_name:
            content+=replace_placeholders(template,record)
    return content
 
def replace_placeholders(template, data):
    """
    Replace placeholders in the template with values from the data dictionary.
    Handles missing data and nested structures gracefully.
    """
 
  
 
    # Replace placeholders in the template
    for key, value in data.items():
        placeholder = f"<<{key}>>"
       
        if isinstance(value, (dict, list)):
            # Convert nested structures to JSON strings (for Terraform compatibility)
            value = json.dumps(value, indent=2).replace('"', '')
        elif isinstance(value, bool):
            value = str(value).lower()  # Ensure boolean values are in lowercase
        elif value is None:
            value = ""  # Replace None with an empty string
        elif value == "not-applicable":
            template = re.sub(rf".*{placeholder}.*\n?", "", template)
        #Replace the placeholder in the template                    
        template = template.replace(placeholder, str(value))
    print(template)
    return template
 
 
# Function to parse Excel input file
def parse_excel(file_path):
    """
    Parse the input Excel file into a dictionary where each sheet represents a resource type.
    """
    excel_data = pd.ExcelFile(file_path)
    data = {}
    for sheet_name in excel_data.sheet_names:
        data[sheet_name] = excel_data.parse(sheet_name, keep_default_na=False).fillna("").to_dict(orient="records")
    return data
 
 
# Function to handle subscription template
def handle_subscription_template(template, records):
    tfvars_content = ""
    template_lines = template.splitlines()
   
    # Extract the first and last lines of the template
    first_line = template_lines[0]
    last_line = template_lines[-1]
   
    # Start the content with the first line of the template
    tfvars_content += first_line + "\n"
   
    # Process each record
    for record in records:
 
       
        resource_content = ""
        
       
        # Process each line of the template (excluding the first and last lines)
        for line in template_lines[1:-1]:
            resource_content += line + "\n"
 
        # After processing all lines, replace placeholders for the whole resource
        resource_content = replace_placeholders(resource_content, record)
       
        tfvars_content += resource_content + "\n"
   
    # End the content with the last line of the template
    tfvars_content += last_line + "\n"
   
    return tfvars_content
 
 
 
def handle_bucket_template(template, records):
    """
    Handles the Bucket template:
    - Adds the first line of the template only once at the start of the tfvars_content.
    - Adds the last line of the template only once at the end of the tfvars_content.
    - Adds the iam_members section after set_roles if set_roles is true.
    """
    tfvars_content = ""
    template_lines = template.splitlines()
   
    # Extract the first and last lines of the template
    first_line = template_lines[0]
    last_line = template_lines[-1]
   
    # Start the content with the first line of the template
    tfvars_content += first_line + "\n"
   
    # Process each record
    for record in records:
        # Check if flags are present
        set_roles = record.get("set_roles")
       
        resource_content = ""
        iam_members_inserted = False  # Flag to track if iam_members has been added
       
        # Process each line of the template (excluding the first and last lines)
        for line in template_lines[1:-1]:
            resource_content += line + "\n"
   
 
        # After processing all lines, replace placeholders for the whole resource
        resource_content = replace_placeholders(resource_content, record)
       
        tfvars_content += resource_content + "\n"
   
    # End the content with the last line of the template
    tfvars_content += last_line + "\n"
   
    return tfvars_content
 
 
def process_node_pools(nodepool_data, nodepool_template):
    """
    Process the node pool data and replace placeholders in the node pool template.
    This function handles multiple node pools.
    """
    nodepool_content = ""
    for nodepool in nodepool_data:
        # Replace placeholders in the node pool template for each node pool entry
        nodepool_content += replace_placeholders(nodepool_template, nodepool) + "\n"
    return nodepool_content
 
def generate_gke_cluster_with_nodepools(gke_cluster_template, nodepool_data, nodepool_template):
    """
    Generates the GKE cluster template with the node pool section inserted.
    """
    # Process the node pools first
    nodepool_content = process_node_pools(nodepool_data, nodepool_template)
    # Replace the placeholder <<node_pool>> with the node pool content
    gke_cluster_with_nodepools = gke_cluster_template.replace("<<node_pool>>", nodepool_content)
    return gke_cluster_with_nodepools
 
# Modify the generate_tfvars function to include BigQuery logic
def generate_tfvars(data, templates):
    """
    Generate the auto.tfvars content by applying data to templates.
    """
    tfvars_content = ""
    global_processed = False
    # Add the global section first (if it exists)
    if "global" in templates and global_processed == False:
    #     tfvars_content += templates["global"] + "\n"
 
        global_template = templates["global"]
        if "global" in data:
            global_data = data["global"]
            for entry in global_data:
                global_template = replace_placeholders(global_template, entry)
 
        tfvars_content += global_template +"\n"
        global_processed = True
 
 
    # Iterate through each resource type (e.g., topics, buckets)
    for resource_type, unfiltered_records in data.items():
        records = [record for record in unfiltered_records if any(record.values())]
        if len(records) == 0:
            continue
        if resource_type in templates and resource_type != "global":
            template = templates[resource_type]
            
            nodepool_processed = False
            if resource_type == "pull_subscription" or resource_type == "big_query" or resource_type == "gcs_subscription":
                # Special handling for pull_subscription
                tfvars_content += handle_subscription_template(template, records)
 
 
            elif resource_type == "bucket" or resource_type == "bucket_dual_region":
                # Special handling for buckets
                tfvars_content += handle_bucket_template(template, records)
                #  elif resource_type == "bucket" or resource_type == "bucket_dual_region":
                # Special handling for buckets
                # tfvars_content += handle_bucket_template(template, records)
 
 
            elif resource_type == "metric_alert_policy":
                if "condition_threshold" in data:
                    condition_threshold_data = data["condition_threshold"]
 
                    template_lines = template.splitlines()
                    first_line = template_lines[0] + "\n"
                    last_line = template_lines[-1] + "\n\n"
 
                    tfvars_content += first_line
 
                    for record in records:
                        condition_threshold = create_threshold(templates["condition_threshold"],condition_threshold_data,record["alert_name"])
                        metric_alert_policy_data = data["metric_alert_policy"]  # Get the node pool data
                        metric_alert_policy_template = templates["metric_alert_policy"]  # Get the node pool template
                        resource_content = replace_placeholders(template, record)
                        resource_lines = resource_content.splitlines()
                        metric_alert_policy_template = "\n".join(resource_lines[1:-1])
                        tfvars_content += metric_alert_policy_template.replace("<<condition_threshold>>",condition_threshold)
                    tfvars_content +=last_line
            
            # Special handling for GKE cluster with node_pool
            elif resource_type == "gke_cluster":
                if "node_pool" in data and not nodepool_processed:  # Ensure node_pool is processed once
                    # Replace placeholders for gke_cluster template
                    template_lines = template.splitlines()
                    first_line = template_lines[0] + "\n"
                    last_line = template_lines[-1] + "\n\n"
    
                    # Add the first line only once at the start of the section
                    tfvars_content += first_line
    
                    for record in records:
                        
                        nodepool_data = data["node_pool"]  # Get the node pool data
                        nodepool_template = templates["node_pool"]  # Get the node pool template
                        resource_content = replace_placeholders(template, record)
                        resource_lines = resource_content.splitlines()
                        gke_cluster_template = "\n".join(resource_lines[1:-1])  # Exclude first and last lines
                    
                    # Generate the GKE cluster with node pools
                    gke_cluster_with_nodepools = generate_gke_cluster_with_nodepools(gke_cluster_template, nodepool_data, nodepool_template)
                    tfvars_content += gke_cluster_with_nodepools + "\n"
                
                    # Mark node_pool as processed to prevent duplication
                    nodepool_processed = True
 
                # Add the last line only once at the end of the section
                tfvars_content += last_line
            
            elif resource_type == "node_pool" or resource_type == "condition_threshold":
                continue
 
            else:
                # Generic handling for other templates
                template_lines = template.splitlines()
                first_line = template_lines[0] + "\n"
                last_line = template_lines[-1] + "\n\n"
 
                # Add the first line only once at the start of the section
                tfvars_content += first_line
 
                for record in records:
                    resource_content = replace_placeholders(template, record)
                    resource_lines = resource_content.splitlines()
                    resource_body = "\n".join(resource_lines[1:-1])  # Exclude first and last lines
                    tfvars_content += resource_body + "\n"
 
                # Add the last line only once at the end of the section
                tfvars_content += last_line
        else:
            print(f"Warning: No template found for resource type '{resource_type}'")
 
    return tfvars_content
 
# Main function
def main():
 
 
    INPUT_EXCEL = sys.argv[1] # input("input xl") # The input Excel file
    OUTPUT_FILE =  sys.argv[2] # input("outpu tfvars path")
 
    TEMPLATE_FOLDER =  sys.argv[3] # input("template folder")
    # Ensure the template folder exists
    if not os.path.exists(TEMPLATE_FOLDER):
        raise FileNotFoundError(f"The template folder '{TEMPLATE_FOLDER}' does not exist.")
   
    # Load templates
    templates = load_templates(TEMPLATE_FOLDER)
    print(f"Loaded templates: {list(templates.keys())}")
 
    # Parse input Excel file
    if not os.path.exists(INPUT_EXCEL):
        raise FileNotFoundError(f"The input Excel file '{INPUT_EXCEL}' does not exist.")
    data = parse_excel(INPUT_EXCEL)
    
 
    # Generate auto.tfvars content
    tfvars_content = generate_tfvars(data, templates)
 
    # Write to output file
    with open(OUTPUT_FILE, "w") as file:
        file.write(tfvars_content)
    try:
        with open(OUTPUT_FILE,'r') as file:
            data1 =file.read()
        hcl2.loads(data1)
        print("no syntax error found")
    except Exception as e:
        print(f"Syntax error: {e}")
 
    print(f"Successfully generated '{OUTPUT_FILE}'.")
 
 
# Entry point
if __name__ == "__main__":
    main()
 
 
 
 
 