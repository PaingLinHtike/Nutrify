import uuid
import os
from image_uploader import _storage_client, _bucket_name

# Upload a file to the bucket. 
def upload_blob(bucket_name, source_file, destination_blob_name, content_type=None):
    """Uploads a local file path or file-like object to the bucket.
       Args : bucket_name: The name of the bucket to upload to.
              source_file: A local file path or file-like object to upload.
              destination_blob_name: The name of the blob to create in the bucket.
              content_type: The content type of the file being uploaded (e.g., "image/jpeg")
    """
    storage_client = _storage_client()
    bucket = storage_client.bucket(_bucket_name(bucket_name))
    blob = bucket.blob(destination_blob_name)

    if isinstance(source_file, (str, os.PathLike)):
        blob.upload_from_filename(str(source_file), content_type=content_type)
    else:
        source_file.seek(0)
        blob.upload_from_file(source_file, content_type=content_type, rewind=True)

    print(f"File uploaded to gs://{bucket.name}/{destination_blob_name}.")


# Create a unique filename using UUID to avoid collisions in storage.
def create_unique_filename() -> str:
    """Create a unique filename using UUID to avoid collisions in storage."""
    unique_id = str(uuid.uuid4())
    return unique_id