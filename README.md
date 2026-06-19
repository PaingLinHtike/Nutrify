# Nutrify

Streamlit app for collecting labeled food images and saving metadata to Google
Sheets.

## Run Locally

```bash
streamlit run food_image_collector.py
```

For local development, put service-account JSON files beside the app if needed:

- `google-storage-creds.json`
- `google-sheets-creds.json`

These files are ignored by Git and should not be committed.

## Streamlit Cloud Setup

Streamlit Cloud cannot read your local credential JSON files. Add the Google
service-account fields in **Manage app > Settings > Secrets** using this TOML
shape:

```toml
[gcp_service_account]
type = "service_account"
project_id = "your-project-id"
private_key_id = "your-private-key-id"
private_key = "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
client_email = "your-service-account@your-project-id.iam.gserviceaccount.com"
client_id = "your-client-id"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
universe_domain = "googleapis.com"
```

If Storage and Sheets use different service accounts, create separate sections
named `[gcp_service_account_storage]` and `[gcp_service_account_sheets]` with
the same keys.

After adding secrets:

1. Grant the service account write access to the
   `food-vision-project-images` Cloud Storage bucket.
2. Share the Google Sheet with the service account `client_email` as an Editor.
3. Reboot the Streamlit Cloud app.
