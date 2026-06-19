import json
import os
from collections.abc import Mapping
from json import JSONDecodeError
from pathlib import Path

from google.oauth2 import service_account

REQUIRED_SERVICE_ACCOUNT_FIELDS = (
    "type",
    "project_id",
    "private_key",
    "client_email",
    "token_uri",
)


def _normalise_service_account_info(credential_info, source):
    if not isinstance(credential_info, Mapping):
        raise RuntimeError(
            f"{source} must contain a service-account object, not a plain value."
        )

    credential_info = dict(credential_info)
    missing_fields = [
        field for field in REQUIRED_SERVICE_ACCOUNT_FIELDS
        if not credential_info.get(field)
    ]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise RuntimeError(
            f"{source} is missing required service-account field(s): {missing}."
        )

    private_key = credential_info["private_key"]
    if isinstance(private_key, str):
        credential_info["private_key"] = private_key.replace("\\n", "\n")

    return credential_info


def _streamlit_secret_info(secret_names):
    try:
        import streamlit as st
    except Exception:
        return None

    for secret_name in secret_names:
        try:
            has_secret = secret_name in st.secrets
        except Exception:
            return None

        if has_secret:
            return _normalise_service_account_info(
                st.secrets[secret_name],
                f"Streamlit secret [{secret_name}]",
            )

    return None


def _streamlit_json_secret_info(secret_name):
    try:
        import streamlit as st
    except Exception:
        return None

    try:
        has_secret = secret_name in st.secrets
    except Exception:
        return None

    if not has_secret:
        return None

    return _load_json_secret(
        st.secrets[secret_name],
        f"Streamlit secret {secret_name}",
    )


def _env_secret_info(env_var):
    raw_value = os.environ.get(env_var)
    if not raw_value:
        return None

    return _load_json_secret(raw_value, f"environment variable {env_var}")


def _load_json_secret(raw_value, source):
    if not isinstance(raw_value, str):
        raise RuntimeError(f"{source} must be a JSON string.")

    try:
        credential_info = json.loads(raw_value)
    except JSONDecodeError as error:
        raise RuntimeError(f"{source} is not valid JSON.") from error

    return _normalise_service_account_info(credential_info, source)


def load_service_account_credentials(
    local_filenames,
    secret_names,
    scopes=None,
    env_var="GOOGLE_SERVICE_ACCOUNT_JSON",
):
    """Load service-account credentials without committing key files."""
    credential_info = (
        _streamlit_secret_info(secret_names)
        or _streamlit_json_secret_info(env_var)
        or _env_secret_info(env_var)
    )
    if credential_info:
        try:
            return service_account.Credentials.from_service_account_info(
                credential_info,
                scopes=scopes,
            )
        except (TypeError, ValueError) as error:
            raise RuntimeError(
                "Google service-account credentials are present but invalid. "
                "Check the private_key and client_email values in Streamlit "
                "Secrets."
            ) from error

    if isinstance(local_filenames, (str, os.PathLike)):
        local_filenames = (local_filenames,)

    for local_filename in local_filenames:
        local_path = Path(__file__).with_name(local_filename)
        if local_path.exists():
            try:
                return service_account.Credentials.from_service_account_file(
                    local_path,
                    scopes=scopes,
                )
            except (OSError, TypeError, ValueError) as error:
                raise RuntimeError(
                    f"Could not load local service-account file {local_filename}."
                ) from error

    return None
