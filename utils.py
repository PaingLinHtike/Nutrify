import uuid
import os
from google.api_core.exceptions import Forbidden, GoogleAPIError, NotFound
from image_uploader import _storage_client, _bucket_name

# Set the bucket name based on the environment variable
if os.environ.get("ENVIRONMENT") == "TEST_NUTRIFY_ENV_VAR":
    print("Using TEST Storage Bucket")
    bucket_name = "food-vision-project-images-test" # Dev Storage for testing
else:
    bucket_name = "food-vision-project-images" # Main Storage

# Upload a file to the bucket. 
def upload_blob(source_file, destination_blob_name, content_type=None):
    """Uploads a local file path or file-like object to the bucket.
       Args : bucket_name: The name of the bucket to upload to.
              source_file: A local file path or file-like object to upload.
              destination_blob_name: The name of the blob to create in the bucket.
              content_type: The content type of the file being uploaded (e.g., "image/jpeg")
    """
    storage_client = _storage_client()
    bucket = storage_client.bucket(_bucket_name(bucket_name))
    blob = bucket.blob(destination_blob_name)

    try:
        if isinstance(source_file, (str, os.PathLike)):
            blob.upload_from_filename(str(source_file), content_type=content_type)
        else:
            source_file.seek(0)
            blob.upload_from_file(source_file, content_type=content_type, rewind=True)
    except Forbidden as error:
        raise RuntimeError(
            "Google Cloud Storage rejected the configured service account. "
            f"Grant it permission to write to bucket {bucket.name}."
        ) from error
    except NotFound as error:
        raise RuntimeError(
            f"Google Cloud Storage bucket {bucket.name} was not found."
        ) from error
    except GoogleAPIError as error:
        raise RuntimeError(
            "Google Cloud Storage upload failed. Check the bucket name and "
            "service-account permissions."
        ) from error

    print(f"File uploaded to gs://{bucket.name}/{destination_blob_name}.")


# Create a unique filename using UUID to avoid collisions in storage.
def create_unique_filename() -> str:
    """Create a unique filename using UUID to avoid collisions in storage."""
    unique_id = str(uuid.uuid4())
    return unique_id
