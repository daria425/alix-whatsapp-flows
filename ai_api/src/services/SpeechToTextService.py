import requests
from google.cloud import speech
from requests.auth import HTTPBasicAuth
import os
import tempfile
import shutil
from dotenv import load_dotenv
load_dotenv()
media_url=os.environ.get("TEST_MEDIA_URL")
username=os.environ.get("TWILIO_ACCOUNT_SID")
password=os.environ.get("TWILIO_AUTH_TOKEN")


class SpeechToTextService:
    def __init__(self, bucket, bucket_name, transcribe_client):
        self.bucket=bucket
        self.bucket_name=bucket_name
        self.transcribe_client=transcribe_client

    def download_audio(self, audio_url):
        temp_dir=tempfile.mkdtemp()
        basic_auth=HTTPBasicAuth(username, password)
        try:
            file_name=audio_url.split("/")[-1]
            response=requests.get(media_url, auth=basic_auth)
            if response.status_code==200:
                content_type = response.headers.get('Content-Type')
                extension = content_type.split('/')[-1]
                file_path = os.path.join(temp_dir, f"{file_name}.{extension}")
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"Media downloaded successfully and saved as {file_path}")
                return file_path, temp_dir
            else:
                print(f"Failed to download media. Status code: {response}")
                return None, temp_dir
        except requests.exceptions.RequestException as e:
            # Handle network-related errors
            print(f"Network error occurred: {e}")
            return None

        except OSError as e:
            # Handle file system errors
            print(f"File I/O error occurred: {e}")
            return None

        except Exception as e:
            # Catch any other exceptions
            print(f"An unexpected error occurred: {e}")
            return None

    def upload_to_gcs(self, file_path):
        destination_blob_name=f"{os.path.basename(file_path)}"
        blob=self.bucket.blob(destination_blob_name)
        blob.upload_from_filename(file_path)
        gcs_uri = f"gs://{self.bucket_name}/{destination_blob_name}"
        return gcs_uri
    
    def transcribe_audio(self, gcs_uri):
        audio=speech.RecognitionAudio(uri=gcs_uri)
        config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.OGG_OPUS,  # Change based on your audio format
        sample_rate_hertz=16000,  # Set based on your file
        language_code="en-US",  # Language of the audio
    )
        response=self.transcribe_client.recognize(config=config, audio=audio)
        transcription = ''
        for result in response.results:
            transcription += result.alternatives[0].transcript

        return transcription

    def handle_transcription(self, audio_url):
        file_path, temp_dir=self.download_audio(audio_url)
        if file_path is None:
            return None
        gcs_uri=self.upload_to_gcs(file_path)
        transcription=self.transcribe_audio(gcs_uri)
        shutil.rmtree(temp_dir)
        return transcription
    
        