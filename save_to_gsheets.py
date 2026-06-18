""""
BEFORE RUNNING:

1. If not already done, enable the Google Sheets API
and check the quota for your project at
https://console.developers.google.com/apis/api/sheets
2. Install the Python client library for Google APIs by running
`pip install -- upgrade google-api-python-client'
"""
from functools import lru_cache
from typing import List

from googleapiclient import discovery
from google_credentials import load_service_account_credentials

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SHEETS_SECRET_NAMES = (
    "gcp_service_account_sheets",
    "gcp_service_account_drive",
    "gcp_service_account",
)

# The ID of the spreadsheet to update.
SPREADSHEET_ID = "1iMrR8XG0r38oqTcZChZAo6Er5lZOrla7vs8m-78kfqY"

# Values will be appended after the last row of the table.
RANGE_ = "Sheet1!A:E"

# How the input data shoutd be interpreted.
VALUE_INPUT_OPTION = "USER_ENTERED" 

# How the input data should be inserted.
INSERT_DATA_OPTION = "INSERT_ROWS" 


@lru_cache
def _sheets_service():
    credentials = load_service_account_credentials(
        ("google-sheets-creds.json", "google-drive-creds.json"),
        SHEETS_SECRET_NAMES,
        scopes=SCOPES,
    )
    if credentials is None:
        raise RuntimeError(
            "Google Sheets credentials are not configured. Add them to "
            "Streamlit secrets or keep an ignored local credentials file."
        )

    return discovery.build(
        'sheets',
        'v4',
        credentials=credentials,
        cache_discovery=False,
    )


# values_to_add = [["12345", "6/14/2026", "150", "50", "pizza "]]   
def append_values_to_gsheet(values_to_add : List[List[str]]):
    """Append values to a Google Sheet.
        Args : values_to_add: A list of lists, where each inner list represents a row of values. Eg: [["12345", "6/14/2026", "150", "50", "pizza "]]
    """

    # Create the JSON-like format for adding values to the spreadsheet.
    value_range_body = {
        "majorDimension": "ROWS",
        "values": values_to_add
    }

    request = _sheets_service().spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID,
        range=RANGE_,
        valueInputOption=VALUE_INPUT_OPTION,
        insertDataOption=INSERT_DATA_OPTION,
        body=value_range_body
    )

    response = request.execute()

    # pprint (response)
    return(response)
