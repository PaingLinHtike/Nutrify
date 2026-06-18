import json
import os
from pathlib import Path

from google.oauth2 import service_account


def _streamlit_secret_info(secret_names):
    try:
        import streamlit as st

        for secret_name in secret_names:
            if secret_name in st.secrets:
                return dict(st.secrets[secret_name])
    except Exception:
        return None

    return None


def _env_secret_info(env_var):
    raw_value = os.environ.get(env_var)
    if not raw_value:
        return None

    return json.loads(raw_value)


def load_service_account_credentials(
    local_filenames,
    secret_names,
    scopes=None,
    env_var="GOOGLE_SERVICE_ACCOUNT_JSON",
):
    """Load service-account credentials without committing key files."""
    credential_info = (
        _streamlit_secret_info(secret_names) or _env_secret_info(env_var)
    )
    if credential_info:
        return service_account.Credentials.from_service_account_info(
            credential_info,
            scopes=scopes,
        )

    if isinstance(local_filenames, (str, os.PathLike)):
        local_filenames = (local_filenames,)

    for local_filename in local_filenames:
        local_path = Path(__file__).with_name(local_filename)
        if local_path.exists():
            return service_account.Credentials.from_service_account_file(
                local_path,
                scopes=scopes,
            )

    return None
