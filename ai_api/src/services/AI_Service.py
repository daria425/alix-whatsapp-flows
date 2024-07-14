from dotenv import load_dotenv
import vertexai
from abc import ABC, abstractmethod
from vertexai.generative_models import (
    Content,
    FunctionDeclaration,
    Part,
    Tool, GenerativeModel
)
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
    def __init__(self, model_source, model_name):
        super().__init__(model_source, model_name)
    
    @staticmethod
    def create_user_prompt(prompt_text):
        user_prompt = Content(
            role="user",
            parts=[
                Part.from_text(prompt_text),
            ],
        )
        return user_prompt
    
    @staticmethod
    def create_func_declaration(func_name, func_description, func_params):
        func = FunctionDeclaration(
            name=func_name,
            description=func_description,
            parameters=func_params
        )
        return func
    
    def create_tool(self, function_dictionaries):
        function_declarations=[]
        for dictionary in function_dictionaries:
            func_declaration=self.create_func_declaration(dictionary["func_name"], dictionary["func_description"], dictionary["func_params"])
            function_declarations.append(func_declaration)
        tool = Tool(function_declarations=function_declarations)
        return [tool]
    
    def get_model_response(self, prompt_text, generation_config, use_tool=False, function_dictionaries=[{}]):
        if use_tool and not function_dictionaries:
            raise ValueError("If use_tool is set to True, function_dictionaries must be provided.")
        tools=[]
        if use_tool:
            tools=self.create_tool(function_dictionaries)
        user_prompt=self.create_user_prompt(prompt_text)
        response = self.model.generate_content(
        user_prompt,
        generation_config=generation_config,
        tools=tools,

)
        if use_tool:
            response_function_call_content = response.candidates[0].content.parts[0].to_dict()
            return response_function_call_content
        else:
            return response

