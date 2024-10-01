from services.SpeechToTextService import SpeechToTextService
from config.speech_api_config import transcribe_client
from config.storage_api_config import bucket, bucket_name
import os
from dotenv import load_dotenv
load_dotenv()
media_url=os.environ.get("TEST_MEDIA_URL")

speech_to_text_service=SpeechToTextService(bucket, bucket_name, transcribe_client)
transcription=speech_to_text_service.handle_transcription(media_url)
print(transcription)
# then save to db