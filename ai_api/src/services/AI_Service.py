from dotenv import load_dotenv
import vertexai
from abc import ABC, abstractmethod
from vertexai.generative_models import GenerativeModel
from config.vertexai_config import vertexai_project_location, vertex_ai_project_id
load_dotenv()


class AI_Service(ABC):
    def __init__(self, model_source, model_name):
        self.model = self.create_model(model_source, model_name)

    def create_model(self, model_source, model_name):
        if model_source == "vertexai":
            vertexai.init(project=vertex_ai_project_id, location=vertexai_project_location)
            return GenerativeModel(model_name)
        else:
            raise ValueError(f"Unsupported model source: {model_source}")
        
class VertexAI_Service(AI_Service):
    @abstractmethod
    def use_model(self):
        pass