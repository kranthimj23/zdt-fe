import os
import yaml
import re
import shutil

def get_fname(line):
    return line.split(":")[0]

def arrage_files_in_deployment_order(order_for_deployment, filenames):
    final_filenames = []
    used_indices = set()

    for name in order_for_deployment:
    # Find and add the matching line(s)
        for idx, line in enumerate(filenames):
            if get_fname(line) == name:
                final_filenames.append(line)
                used_indices.add(idx)
                break  # Assuming only one per name

    # Add the rest (not in deployment order) after
    for idx, line in enumerate(filenames):
        if idx not in used_indices:
            final_filenames.append(line)
    return final_filenames


def process_order_for_deployment(order_for_deployment):
    order_for_deployment_dict = {}
    for idx, ele in enumerate(order_for_deployment):
        if "mb-" in ele:
            ele = ele[3:]
        if ele in ["config", "aem-publisher"]:
            order_for_deployment_dict[ele] = idx
            continue
        if "-v1" not in ele:
            ele += "-v1"
        # order_for_deployment[idx] = ele
        order_for_deployment_dict[ele] = idx
    return order_for_deployment_dict


def update_txt_file_with_yaml_values(txt_file_path, yaml_folder_path):
    # Read the filenames from the .txt file
    with open(txt_file_path, 'r') as file:
        filenames = [line.strip() for line in file.readlines()]
 
    # For each filename in the txt file, find the corresponding YAML file
    #this loop replace each line in the [env].txt from name of .yml file of service
    #to service_name:app_name(taken from .yml file of service)
    for filename in filenames:
        yaml_file_path = os.path.join(yaml_folder_path, f"{filename}.yaml")
        if os.path.exists(yaml_file_path):
            with open(yaml_file_path, 'r') as yaml_file:
                yaml_content = yaml.safe_load(yaml_file)
                name_value = ''
                name_value = yaml_content.get('app', {}).get('name', None)
                if name_value:
                    # Replace the filename in the txt file with the name value from YAML
                    filenames[filenames.index(filename)] = f"{filename}:{name_value}"

    order_for_deployment = [
        "mb-secret-manager", "mb-config-cache","mb-obp-proxy", "mb-secure-channel", 
        "mb-blackout", "mb-admin-integration", "mb-config" , "mb-profile-msc", "mb-notification-msc",
        "mb-auth-msc", "aem-publisher", "mb-event-log-replay"
    ]
    order_for_deployment = process_order_for_deployment(order_for_deployment)
    filenames = arrage_files_in_deployment_order(order_for_deployment, filenames)

    print(filenames)

    # Write the updated filenames back to the txt file
    with open(txt_file_path, 'w') as file:
        for filename in filenames:
            file.write(f"{filename}\n")


def insert_hardcoded_value(folder, service_list, higher_env):
    """
    Inserts a hardcoded multi-line value in the 'env' section safely.
    Detects proper indentation and avoids duplicate {{ end }}.
    """
    temp_path = os.path.join(folder, "helm-charts", "templates", "deployment.yaml")

    with open(temp_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    inside_env = False
    env_start_idx = None
    env_indent = ""
    block_depth = 0
    existing_services = set()

    for i, line in enumerate(lines):
        stripped = line.strip()

        if not inside_env and stripped.startswith("env:"):
            inside_env = True
            env_start_idx = i
            env_indent = re.match(r"^(\s*)", line).group(1)
            new_lines.append(line)
            continue

        if inside_env:
            match = re.search(r'(\.Files\.Get\s+")([^"]+)(")', line)
            if match:
                full_path = match.group(2)
                folder_part, filename_part = full_path.split('/', 1) if '/' in full_path else ("", full_path)
                folder_part = f"{higher_env}-values"
                new_path = f"{folder_part}/{filename_part}"
                line = line[:match.start(2)] + new_path + line[match.end(2):]
                # print(line)
            if re.search(r"{{[-]?\s*(with|if|range)\b", stripped):
                block_depth += 1
            elif re.search(r"{{[-]?\s*end\s*}}", stripped):
                block_depth -= 1

            # # Detect existing service blocks inside env:
            match = re.search(r"{{[-]?\s*with\s+\.Values\.env\.([a-zA-Z0-9_]+)\s*}}", stripped)
            if match:
                existing_services.add(match.group(1))

            # Detect end of env block (blank line or new YAML key at same indent)
            if block_depth <= 0 and stripped and not stripped.startswith("{{"):
                inside_env = False
                # Insert our hardcoded blocks here before moving on
                for service_file in service_list:
                    if service_file in ["data", "env"]:
                        print(f"Skipping {service_file}.yaml")
                        continue
                    sf = service_file.replace("-", "_")
                    if sf not in existing_services:
                        hardcoded_block = [
                            f"{env_indent}  {{{{- with .Values.env.{sf} }}}}\n",
                            f"{env_indent}    {{{{- toYaml . | nindent 12 }}}}\n",
                            f"{env_indent}  {{{{- end }}}}\n"
                        ]
                        new_lines.extend(hardcoded_block)
            new_lines.append(line)
        else:
            new_lines.append(line)

    with open(temp_path, "w") as f:
        f.writelines(new_lines)


def modify_deployment_yaml(folder, deleted_services,higher_env):
    """
    Safely remove entire {{ with .Values.env.<service> }} ... {{ end }} blocks
    from deployment.yaml for deleted services.
    Counts block nesting to avoid leaving stray {{ end }}.
    """
    temp_path = os.path.join(folder, "helm-charts", "templates", "deployment.yaml")

    with open(temp_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    skip_block = False
    block_depth = 0

    for line in lines:
        if not skip_block:
            # Check for start of a with block for a deleted service
            for service in deleted_services:
                service_name = service.replace("-", "_")
                if re.search(rf"{{[-]?\s*with\s+\.Values\.env\.{service_name}\s*}}", line):
                    skip_block = True
                    block_depth = 1
                    break

            if not skip_block:
                new_lines.append(line)
        else:
            # Inside a skipped block — track nesting
            if re.search(r"{{[-]?\s*(with|if|range)\b", line):
                block_depth += 1
            elif re.search(r"{{[-]?\s*end\s*}}", line):
                block_depth -= 1
                if block_depth == 0:
                    skip_block = False  # End of our block — don't append this end
            # Skip everything while inside the block

    with open(temp_path, "w") as f:
        f.writelines(new_lines)
    

    # Define destination path and create directories if needed
    temp_path_app = os.path.join(folder, "helm-charts", f"{higher_env}-values", "app-values", "deployment")
    if not os.path.exists(temp_path_app):
        os.makedirs(temp_path_app, exist_ok=True)
    file_path = os.path.join(temp_path_app, "deployment.yaml")

    # Copy the file from temp_path to file_path
    shutil.copy2(temp_path, file_path)