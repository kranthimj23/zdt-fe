"""
Continuous Deployment module for Test Data Generator CRN

This module contains all CD automation scripts for managing:
- Promotion branch lifecycle
- Configuration value promotion across environments
- Release note generation
- Configuration file generation

Main Scripts:
- promotion_branch_manager.py: Manages promotion branches and meta-sheets
- values_promotion.py: Promotes configuration values from service repos
- create_release_note.py: Generates release notes with change tracking
- generate_config.py: Generates configuration files from release notes
- main.py: Main orchestration script that runs all three scripts

"""

__all__ = ["scripts"]
__version__ = "1.0.0"

