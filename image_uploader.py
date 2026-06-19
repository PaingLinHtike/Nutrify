from functools import lru_cache

from google.cloud import storage
from google_credentials import load_service_account_credentials
from rich import pretty
pretty.install()

STORAGE_SECRET_NAMES = ("gcp_service_account_storage", "gcp_service_account")

@lru_cache
def _storage_client():
    """Create a Storage client from explicit service-account credentials."""
    credentials = load_service_account_credentials(
        "google-storage-creds.json",
        STORAGE_SECRET_NAMES,
    )
    if credentials is not None:
        return storage.Client(credentials=credentials, project=credentials.project_id)

    raise RuntimeError(
        "Google Cloud Storage credentials are not configured. Add a "
        "[gcp_service_account] or [gcp_service_account_storage] section "
        "to Streamlit Secrets, then reboot the app."
    )

def _bucket_name(bucket_name):
    return bucket_name.removeprefix("gs://").rstrip("/")
