from dotenv import load_dotenv
import os
load_dotenv()
vertexai_project_location=os.environ.get("GOOGLE_PROJECT_LOCATION")
vertex_ai_project_id=os.environ.get("GOOGLE_PROJECT_ID")