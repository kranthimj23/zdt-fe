#!/usr/bin/env python3
"""
Main orchestration script that runs merger.py, values-promotion.py, and create-release-note.py in sequence.

This script takes all required parameters and executes the three scripts in the correct order:
1. merger.py - Fetches branches from meta-sheet and creates new branches if needed
2. values-promotion.py - Promotes configuration values from service repos to promotion repo
3. create-release-note.py - Generates release notes comparing two promotion branches

Usage:
    python main.py <lower-env> <higher-env> <promotional-repo> <new-version> <services-list> <promote-branch-x-1>

Arguments:
    1. lower-env          : Source environment (dev, sit, uat)
    2. higher-env         : Target environment (sit, uat, prod)
    3. promotional-repo   : Promotion repository URL (HTTPS)
    4. new-version        : Version for release (X.Y.Z format)
    5. services-list      : Path to file with service URLs
    6. promote-branch-x-1 : Previous stable release branch (release/X.Y.Z)

Example:
    python main.py dev sit https://github.com/kranthimj23/promotion-repo.git 2.0.0 services_list.txt release/1.0.0

Note:
    --target-branch and --promote-branch-x are auto-generated from new-version
    Example: new-version 2.0.0 → release/2.0.0
"""

import sys
import os
import subprocess


def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def run_script(script_name, script_path, args, description):
    """
    Execute a Python script with given arguments.

    Args:
        script_name: Name of the script for logging
        script_path: Absolute path to the script
        args: List of arguments to pass to the script
        description: Description of what the script does

    Returns:
        bool: True if successful, False otherwise
    """
    print_section(description)

    if not os.path.exists(script_path):
        print(f"❌ Error: Script '{script_path}' not found.")
        return False

    cmd = ["python3", script_path] + args
    print(f"Running: {' '.join(cmd)}\n")

    try:
        result = subprocess.run(cmd, check=True, capture_output=False, text=True)
        print(f"\n✅ {script_name} completed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {script_name} failed with return code {e.returncode}")
        return False
    except Exception as e:
        print(f"\n❌ Error running {script_name}: {e}")
        return False


def print_usage():
    """Print usage information."""
    print("""
Usage:
    python main.py <lower-env> <higher-env> <promotional-repo> <new-version> <services-list> <promote-branch-x-1>

Arguments:
    1. lower-env          : Source environment (dev, sit, uat)
    2. higher-env         : Target environment (sit, uat, prod)
    3. promotional-repo   : Promotion repository URL (HTTPS)
    4. new-version        : Version for release (X.Y.Z format)
    5. services-list      : Path to file with service URLs
    6. promote-branch-x-1 : Previous stable release branch (release/X.Y.Z)

Example:
    python main.py dev sit https://github.com/kranthimj23/promotion-repo.git 2.0.0 services_list.txt release/1.0.0

Auto-Generated:
    --target-branch → release/{new-version}
    --promote-branch-x → release/{new-version}
    """)


def main():
    """Main orchestration function."""

    # Check if correct number of arguments provided
    if len(sys.argv) != 7:
        print("❌ Error: Incorrect number of arguments!")
        print_usage()
        sys.exit(1)

    # Parse command-line arguments from sys.argv
    lower_env = sys.argv[1]
    higher_env = sys.argv[2]
    promotional_repo = sys.argv[3]
    new_version = sys.argv[4]
    services_list = sys.argv[5]
    promote_branch_x_1 = sys.argv[6]

    # Get the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Define script paths
    promotion_branch_manager_script = os.path.join(script_dir, "promotion_branch_manager.py")
    values_promotion_script = os.path.join(script_dir, "sync_yaml.py")
    create_release_note_script = os.path.join(script_dir, "create_release_note.py")

    print_section("Pipeline Orchestration Started")
    print(f"Script directory: {script_dir}\n")
    print(f"Parameters provided:")
    print(f"  Lower env: {lower_env}")
    print(f"  Higher env: {higher_env}")
    print(f"  Promotional repo: {promotional_repo}")
    print(f"  New version: {new_version}")
    print(f"  Services list: {services_list}")
    print(f"  Promote branch x-1: {promote_branch_x_1}\n")

    # Auto-generate branch names from new-version
    target_branch = f"release/{new_version}"
    promote_branch_x = f"release/{new_version}"

    print(f"Auto-generated branches from version {new_version}:")
    print(f"  Target branch: {target_branch}")
    print(f"  Promote branch-x: {promote_branch_x}\n")

    # Validate services_list file
    if not os.path.exists(services_list):
        print(f"❌ Error: Services list file '{services_list}' not found.")
        sys.exit(1)

    print(f"Services list file: {services_list}")
    with open(services_list, 'r') as f:
        services = [line.strip() for line in f.readlines() if line.strip()]
        print(f"Found {len(services)} services:")
        for i, service in enumerate(services[:5], 1):
            print(f"  {i}. {service}")
        if len(services) > 5:
            print(f"  ... and {len(services) - 5} more\n")
        else:
            print()

    # ====================
    # Step 1: Run merger.py
    # ====================
    if 'hf' in promote_branch_x:
        promote_branch_x_1 = input("Enter previous stable release branch: ").strip()
        merger_args = [
            lower_env,
            higher_env,
            promotional_repo,
            new_version,
            promote_branch_x_1
        ]
    else:
        merger_args = [
            lower_env,
            higher_env,
            promotional_repo,
            new_version
        ]
    if not run_script(
        "promotion_branch_manager.py",
        promotion_branch_manager_script,
        merger_args,
        "Step 1/3: Running promotion_branch_manager.py - Fetching branches and creating new branches if needed"
    ):
        print("\n❌ Pipeline failed at promotion_branch_manager.py")
        sys.exit(1)

    # ==================================
    # Step 2: Run values-promotion.py
    # ==================================
    values_promo_args = [
        promotional_repo,
        target_branch,
        lower_env,
        services_list
    ]

    if not run_script(
        "sync_yaml.py",
        values_promotion_script,
        values_promo_args,
        "Step 2/3: Running values-promotion.py - Promoting configuration values"
    ):
        print("\n❌ Pipeline failed at values-promotion.py")
        sys.exit(1)

    # ======================================
    # Step 3: Run create-release-note.py
    # ======================================
    create_release_note_args = [
        promote_branch_x_1,
        promote_branch_x,
        lower_env,
        higher_env,
        promotional_repo
    ]

    if not run_script(
        "create-release-note.py",
        create_release_note_script,
        create_release_note_args,
        "Step 3/3: Running create-release-note.py - Generating release notes"
    ):
        print("\n❌ Pipeline failed at create-release-note.py")
        sys.exit(1)

    # Success!
    print_section("Pipeline Completed Successfully")
    print("✅ All scripts executed successfully!")
    print("Summary:")
    print(f"  ✓ Managed promotion branches using promotion_branch_manager.py")
    print(f"  ✓ Promoted values using sync_yaml.py")
    print(f"  ✓ Generated release notes using create_release_note.py")
    print("\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Pipeline interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)





























