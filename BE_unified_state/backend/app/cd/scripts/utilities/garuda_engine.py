import json
from utilities.helpers import get_parent_path
from utilities.json_and_yaml_helpers import dump_and_replace

def compare(le_old, le_new, root, changes, he_old, envs, path=''):
    # Handle dictionary structures
    if isinstance(le_old, dict) and isinstance(le_new, dict):

        he_old = he_old or {}

        all_keys = set(he_old.keys()) | set(le_old.keys()) | set(le_new.keys())

        for k in all_keys:
            new_key_path = f"{path}//{k}" if path else k

            he_val = he_old.get(k)
            le_old_val = le_old.get(k)
            le_new_val = le_new.get(k)

            # 🔴 Deleted (exists in old lower but removed in new)
            if k in le_old and k not in le_new:
                modified_json = dump_and_replace(
                    le_old_val,
                    lower_env=envs[0],
                    higher_env=envs[1]
                )

                changes.append((
                    root, 'delete', get_parent_path(new_key_path),
                    '',
                    json.dumps(le_old_val, indent=4),
                    '',
                    json.dumps(he_val, indent=4) if he_val else '',
                    'Deleted'
                ))
            # 🔴 Deletion Pending (exists in higher, removed in new)
            elif k in he_old and k not in le_new:
                changes.append((
                    root, 'pending delete', get_parent_path(new_key_path),
                    '', '', '',
                    json.dumps(he_val, indent=4),
                    'Deletion Pending'
                ))

            # 🟢 Added / Promotion Pending
            elif k in le_new and k not in he_old:
                modified_json = dump_and_replace(
                    le_new_val,
                    lower_env=envs[0],
                    higher_env=envs[1]
                )

                if k not in le_old:
                    changes.append((
                        root, 'add', get_parent_path(new_key_path),
                        json.dumps(le_new_val, indent=4),
                        '',
                        modified_json,
                        '',
                        'Added'
                    ))
                else:
                    changes.append((
                        root, 'pending add', get_parent_path(new_key_path),
                        json.dumps(le_new_val, indent=4),
                        '',
                        modified_json,
                        '',
                        'Promotion Pending'
                    ))

            # 🔁 Recursive compare
            elif k in le_old and k in le_new:
                compare(
                    le_old_val,
                    le_new_val,
                    root,
                    changes,
                    he_val,
                    envs,
                    new_key_path
                )

    # Handle lists
    elif isinstance(le_old, list) and isinstance(le_new, list):
        if all(isinstance(i, dict) for i in le_old) and all(isinstance(i, dict) for i in le_new):
            # Check if both lists are not empty
            if le_old and le_new and "name" in le_old[0] and "name" in le_new[0]:
                compare_list_of_dicts(le_old, le_new, root, changes, he_old, envs, path)
            else:
                # Handle lists without "name" key or if lists are empty
                for i, le_old_item in enumerate(le_old):
                    if i < len(le_new):
                        if le_old_item != le_new[i]:
                            modified_json = dump_and_replace(le_new[i], lower_env=envs[0], higher_env=envs[1])
                            changes.append((root, 'modify', f"{path}", "["+json.dumps(le_new[i], indent=4)+"]", "["+json.dumps(le_old_item, indent=4)+"]",  "["+modified_json+"]","["+json.dumps(he_old[i], indent=4)+"]",'Modified'))
                    else:
                        modified_json = dump_and_replace(le_old_item, lower_env=envs[0], higher_env=envs[1])
                        changes.append((root, 'delete', f"{path}", '',json.dumps(le_old_item, indent=4), '',json.dumps(he_old[i], indent=4),'Deleted'))
 
 
                # Add any new elements from the new list
                for i in range(len(le_old), len(le_new)):
                    modified_json = dump_and_replace(le_new[i], lower_env=envs[0], higher_env=envs[1])
                    changes.append((root, 'add', f"{path}", json.dumps(le_new[i], indent=4), '',modified_json,'', 'Added'))
 
    # Compare scalar values
    else:
        if le_old != le_new:
            path = get_parent_path(path)
            modified_json = dump_and_replace(le_new, lower_env=envs[0], higher_env=envs[1])
            changes.append((root, 'modify', path, json.dumps(le_new, indent=4), json.dumps(le_old, indent=4) ,modified_json,json.dumps(he_old, indent=4) ,'Modified'))


def compare_list_of_dicts(le_old_list, le_new_list, root, changes, he_old_list, envs, path=''):

    le_old_dict = {i["name"]: i for i in le_old_list if "name" in i}
    le_new_dict = {i["name"]: i for i in le_new_list if "name" in i}
    he_old_dict = {i["name"]: i for i in he_old_list if "name" in i}

    all_keys = set(le_old_dict) | set(le_new_dict) | set(he_old_dict)

    for key in all_keys:
        le_old_item = le_old_dict.get(key)
        le_new_item = le_new_dict.get(key)
        he_old_item = he_old_dict.get(key)

        key_path = f"{path}//{key}"

        # 🔴 Deleted
        if key in le_old_dict and key not in le_new_dict:
            modified_json = dump_and_replace(
                le_old_item,
                lower_env=envs[0],
                higher_env=envs[1]
            )
            changes.append((
                root, 'delete', get_parent_path(key_path),
                '',
                json.dumps(le_old_item, indent=4),
                '',
                json.dumps(he_old_item, indent=4) if he_old_item else '',
                'Deleted'
            ))
        # 🔴 Deletion Pending
        elif key in he_old_dict and key not in le_new_dict:
            changes.append((
                root, 'pending delete', get_parent_path(key_path),
                '', '', '',
                json.dumps(he_old_item, indent=4),
                'Deletion Pending'
            ))

        # 🟢 Added / Promotion Pending
        elif key in le_new_dict and key not in he_old_dict:
            modified_json = dump_and_replace(
                le_new_item,
                lower_env=envs[0],
                higher_env=envs[1]
            )

            if key not in le_old_dict:
                changes.append((
                    root, 'add', get_parent_path(key_path),
                    json.dumps(le_new_item, indent=4),
                    '',
                    modified_json,
                    '',
                    'Added'
                ))
            else:
                changes.append((
                    root, 'pending add', get_parent_path(key_path),
                    json.dumps(le_new_item, indent=4),
                    '',
                    modified_json,
                    '',
                    'Promotion Pending'
                ))

        # 🔁 Modified
        elif le_old_item != le_new_item:
            modified_json = dump_and_replace(
                le_new_item,
                lower_env=envs[0],
                higher_env=envs[1]
            )
            changes.append((
                root, 'modify', get_parent_path(key_path),
                json.dumps(le_new_item, indent=4),
                json.dumps(le_old_item, indent=4),
                modified_json,
                json.dumps(he_old_item, indent=4) if he_old_item else '',
                'Modified'
            ))

def handle_data_env(json_data, service_name, change_request, parsed_value):
    obj = json_data.setdefault(service_name, [])

    if change_request == 'add' or change_request == 'pending':
        if not any(isinstance(entry, dict) and entry.get('name') == parsed_value.get('name') for entry in obj):
            obj.append(parsed_value)
            print(f"Added to '{service_name}': {parsed_value}")
        else:
            print(f"Warning: Entry with name '{parsed_value.get('name')}' already exists in '{service_name}'.")

    elif change_request == 'modify':
        for entry in obj:
            if isinstance(entry, dict) and entry.get('name') == parsed_value.get('name'):
                entry.update(parsed_value)
                print(f"Modified entry in '{service_name}': {entry}")
                break
        else:
            print(f"Warning: Attempted to modify non-existent entry '{parsed_value.get('name')}' in '{service_name}'.")

    elif change_request == 'delete':
        json_data[service_name] = [entry for entry in obj if not (isinstance(entry, dict) and entry.get('name') == parsed_value.get('name'))]
        print(f"Deleted entry from '{service_name}' with name '{parsed_value.get('name')}'.")
