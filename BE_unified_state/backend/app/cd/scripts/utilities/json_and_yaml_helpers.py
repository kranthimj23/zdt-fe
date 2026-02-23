import os
import yaml
import json


def fetch_json(target_folder, env):
    json_path = ''
    foldername = f"{env}-values"
    for root, folders, files in os.walk(target_folder):
        if foldername in folders:
            lower_env_path = os.path.join(root, foldername, 'app-values')
            for filename in os.listdir(lower_env_path):
                if filename == f"config-{env}.json":
                    json_path = os.path.join(lower_env_path, filename)
                    break
            if not json_path:
                json_path = os.path.join(lower_env_path, f"config-{env}.json")
                with open(json_path, 'w') as f:
                    json.dump({}, f)
            break
 
    return json_path


def get_json_data_for_env(target_folder, env):
    lower_env_x_1_json_path = fetch_json(target_folder, env)
    lower_env_path = os.path.dirname(lower_env_x_1_json_path)
    json_data = read_yaml_files_to_json(lower_env_path)

    with open(lower_env_x_1_json_path, 'w') as file:
        json.dump(json_data, file, indent=4)

    return json_data


def read_yaml_files_to_json(folder_path):
    json_data = {}
 
    for filename in os.listdir(folder_path):
        if filename.endswith('.yaml') or filename.endswith('.yml'):
            yaml_file_path = os.path.join(folder_path, filename)
            with open(yaml_file_path, 'r') as f:
                yaml_content = yaml.safe_load(f)
                root_object = os.path.splitext(filename)[0]
                json_data[root_object] = yaml_content
    return json_data


def dump_and_replace(json_obj, lower_env, higher_env):
    json_str = json.dumps(json_obj, indent=4)
    return json_str


def prepare_data(target_folder, env):
    data = get_json_data_for_env(target_folder, env)
    return data


def save_json_to_file(json_data, output_file):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(json_data, f, indent=4)


def process_json_data(data):
    if isinstance(data, list):
        return [process_json_data(item) for item in data]
    elif isinstance(data, dict):
        return {key: process_json_data(value) for key, value in data.items()}
    return data


def create_yaml_files_from_json(updated_output_file, output_folder):
    with open(updated_output_file, 'r') as json_file:
        json_data = json.load(json_file)
 
    os.makedirs(output_folder, exist_ok=True)
 
    for root_object, data in json_data.items():
        yaml_file_path = os.path.join(output_folder, f"{root_object}.yaml")
        processed_data = process_json_data(data)
 
        with open(yaml_file_path, 'w') as yaml_file:
            yaml.dump(processed_data, yaml_file, default_flow_style=False, sort_keys=False)


def try_parse_json(value):
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def copy_missing_yaml_files(higher_env_x_1, lower_env_x, lower_env, higher_env):
    if not os.path.exists(higher_env_x_1):
        print(f"Error: The folder {higher_env_x_1} does not exist.")
    if not os.path.exists(lower_env_x):
        print(f"Error: The folder {lower_env_x} does not exist.")
 
    higher_env_x_1_files = set(os.listdir(higher_env_x_1))
    lower_env_x_files = set(os.listdir(lower_env_x))
 
    # Identify YAML files present in lower_env_x but not in higher_env_x_1
    missing_files = [f for f in lower_env_x_files if f.endswith(('.yaml', '.yml')) and f not in higher_env_x_1_files]
 
    for filename in missing_files:
        source_path = os.path.join(lower_env_x, filename)
        destination_path = os.path.join(higher_env_x_1, filename)
 
        try:
            shutil.copy2(source_path, destination_path)  # copy2 preserves metadata
        except Exception as e:
            print(f"Error copying {filename}: {e}")