import os
from pymongo import MongoClient, errors
from dotenv import load_dotenv
load_dotenv()
MONGO_URI=os.environ.get("MONGO_URI")
DB_NAME=os.environ.get("DB_NAME", "controlRoomDB_dev")

class DatabaseService:
    def __init__(self, db):
        try: 
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[db]
        except errors.ConnectionFailure as e:
            print("error connecting to MongoDB")
            raise
    
    def close(self):
        self.client.close()

    def update_message_text(self, message_sid, transcription, gcs_uri):
        message_collection=self.db["messages"]
        flow_history_collection=self.db["flow_history"]
        try:
           message_collection.update_one({"MessageSid": message_sid}, {"$set": {"Body": transcription, "gcsAudioUri": gcs_uri} } )
           flow_history_collection.update_one(         {
                "surveyResponses.originalMessageSid": message_sid  # Filter to find the document
            },
            {
                "$set": {
                    "surveyResponses.$.userResponse": f"<transcript>{transcription}</transcript>", 
                    "surveyResponses.$.gcsAudioUri":gcs_uri
                      
                          # Set the new userResponse for the matched element
                }
            })
           print(f"Message {message_sid} body updated to {transcription}")
        except errors.PyMongoError as e: 
            print(f"Error in update operation: {e}")

    

def get_database_service():
    db_service = DatabaseService(DB_NAME)  # Replace with your database name
    try:
        yield db_service
    finally:
        db_service.close()