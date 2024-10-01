from google.cloud import storage
import os
from dotenv import load_dotenv
load_dotenv()
bucket_name=os.environ.get("BUCKET_NAME")
storage_client=storage.Client()
bucket=storage_client.bucket(bucket_name)