#!/usr/bin/env python3
"""
HACK Platform Environment & Config Helper
Loads and parses .env file variables without requiring external third-party dependencies.
"""

import os
from pathlib import Path
from typing import Dict, Optional

def load_env(env_path: Optional[str] = None) -> Dict[str, str]:
    """
    Parses a .env file into os.environ.
    Defaults to looking for .env in the repository root.
    """
    if env_path is None:
        # Resolve to repo root relative to this script
        base_dir = Path(__file__).resolve().parent.parent
        env_path = base_dir / ".env"
    else:
        env_path = Path(env_path)

    env_vars: Dict[str, str] = {}
    if not env_path.is_file():
        return env_vars

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # Ignore comments and empty lines
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                env_vars[key] = val
                # Populate os.environ if not already set
                if key not in os.environ:
                    os.environ[key] = val

    return env_vars

def get_env_var(key: str, default: Optional[str] = None) -> Optional[str]:
    """Retrieve an environment variable, loading .env if not already loaded."""
    if key not in os.environ:
        load_env()
    return os.environ.get(key, default)

if __name__ == "__main__":
    loaded = load_env()
    print(f"Loaded {len(loaded)} keys from .env")
