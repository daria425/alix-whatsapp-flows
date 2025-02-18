from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import vertexai
from ..config.openai_config import openai
from abc import ABC
import json
from vertexai.generative_models import (
    Content,
    FunctionDeclaration,
    Part,
    Tool, GenerativeModel
)
from ..config.vertexai_config import vertexai_project_location, vertex_ai_project_id
import os
import time
load_dotenv()
ENHAM_ASSISTANT_ID=os.environ.get("ENHAM_ASSISTANT_ID")

class AI_Service(ABC):
    """
    Abstract base class for AI services. Handles the initialization of generative models from a specified source.

    Attributes:
        model (GenerativeModel): The generative model instance initialized for the service.
    """

    def __init__(self, model_source, model_name=None):
        self.model = self.create_model(model_source, model_name)

    def create_model(self, model_source, model_name=None):
        if model_source == "vertexai":
            vertexai.init(project=vertex_ai_project_id, location=vertexai_project_location)
            return GenerativeModel(model_name)
        elif model_source=="openai":
            return openai
        else:
            raise ValueError(f"Unsupported model source: {model_source}")
        
class VertexAI_Service(AI_Service):
    """
    Service for interacting with Vertex AI generative models. Provides methods for creating prompts, defining tools, and processing messages.

    Inherits:
        AI_Service
    """
    def __init__(self, model_source: str, model_name:str):
        super().__init__(model_source, model_name)

    @staticmethod
    def create_user_prompt(prompt_text:str)->Content:
        """
        Create a user prompt for the generative model.

        Args:
            prompt_text (str): The text content of the user prompt.

        Returns:
            Content: The formatted user prompt content.
        """
        user_prompt = Content(
            role="user",
            parts=[
                Part.from_text(prompt_text),
            ],
        )
        return user_prompt
    
    @staticmethod
    def create_func_declaration(
        func_name: str, func_description: str, func_params: Dict[str, Any]
    ) -> FunctionDeclaration:
        """
        Create a function declaration for a tool.

        Args:
            func_name (str): The name of the function.
            func_description (str): A description of the function's purpose.
            func_params (dict): Parameters required by the function.

        Returns:
            FunctionDeclaration: The function declaration object.
        """
        func = FunctionDeclaration(
            name=func_name,
            description=func_description,
            parameters=func_params
        )
        return func
    
    def create_tool(self, function_dictionaries: List[Dict[str, Any]]) -> List[Tool]:
        """
        Create tools from a list of function dictionaries.

        Args:
            function_dictionaries (list[dict]): A list of dictionaries containing function metadata.

        Returns:
            list[Tool]: A list of tools created from the function declarations.
        """
        function_declarations=[]
        for dictionary in function_dictionaries:
            func_declaration=self.create_func_declaration(dictionary["func_name"], dictionary["func_description"], dictionary["func_params"])
            function_declarations.append(func_declaration)
        tool = Tool(function_declarations=function_declarations)
        return [tool]
    
    def get_model_response(
        self,
        prompt_text: str,
        generation_config: Dict[str, Any],
        use_tool: bool = False,
        function_dictionaries: Optional[List[Dict[str, Any]]] = None,
    ) -> Any:
        """
        Generate a response from the model using a prompt and configuration.

        Args:
            prompt_text (str): The input prompt for the model.
            generation_config (dict): Configuration for content generation (e.g., temperature).
            use_tool (bool, optional): Whether to use tools in the generation. Defaults to False.
            function_dictionaries (list[dict], optional): Metadata for tools, if tools are used. Defaults to None.

        Returns:
            Any: The generated content or function call output.

        Raises:
            ValueError: If `use_tool` is True but no `function_dictionaries` are provided.
        """
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
            return response.text
        
    
    def describe_signposting_options(self, options: List[Dict[str, Any]], category:str)->List[str]:
        model_responses=[]
        for option in options:
            print(option)
            input=json.dumps(option)
            prompt=f"""
                This is a dictionary representing information on a support organization within the UK. 
                 The organization has been categorized. The category is {category}.
                write a concise and helpful description of the organization. Don't mention the website.
                Mention the name first. Include any additional details if you have knowledge of them. Keep your answer in the range of 2 sentences.
                Organization dictionary:
                {input}               
"""
            response=self.get_model_response(prompt, {"temperature":0.6})
            location=option['postcode'] if option['location_scope']=='local' else option['area_covered'] #TO-DO check location logic
            detail=f"""Website/Social URL: {option['external_url']}\nLocation: {location}"""
            final_response=f"""{response}\n{detail}"""
            model_responses.append(final_response)
        return model_responses

            
class OpenAI_Service(AI_Service):
    ASSISTANT_IDS={
        "enham": ENHAM_ASSISTANT_ID
    }
    def __init__(self, model_source: str):
        super().__init__(model_source)

    @staticmethod
    def select_assistant(service):
        return OpenAI_Service.ASSISTANT_IDS[service]
    
    def create_thread(self, user_message: str)->str:
        thread=self.model.beta.threads.create(messages=[
            {
                "role":"user", 
                "content": user_message
            }
        ])
        return thread.id
    def create_run(self, service, thread_id)->dict:
        """
        Creates and polls a run for the given thread ID using the assistant ID.

        Args:
            service (str): The service name to fetch the assistant ID.
            thread_id (str): The ID of the thread to create a run for.

        Returns:
            dict: The list of messages in the thread upon completion.
        """
        assistant_id=self.select_assistant(service)
        run=self.model.beta.threads.runs.create_and_poll(thread_id=thread_id, assistant_id=assistant_id)
        while run.status !="completed":
            print(f"Run status: {run.status}")
            time.sleep(1)
            run=self.model.beta.threads.runs.retrieve(run_id=run.id, thread_id=thread_id)
        
        response=self.model.beta.threads.messages.list(thread_id=thread_id)
        return response
        
    

    








    

