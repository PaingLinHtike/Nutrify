from google.cloud import storage
from google_credentials import load_service_account_credentials
from rich import pretty
pretty.install()

STORAGE_SECRET_NAMES = ("gcp_service_account_storage", "gcp_service_account")

# Create a Storage client from ADC or the local service account file.
def _storage_client():
    """Create a Storage client from ADC or the local service account file."""
    credentials = load_service_account_credentials(
        "google-storage-creds.json",
        STORAGE_SECRET_NAMES,
    )
    if credentials:
        return storage.Client(credentials=credentials, project=credentials.project_id)

    return storage.Client()

def _bucket_name(bucket_name):
    return bucket_name.removeprefix("gs://").rstrip("/")
