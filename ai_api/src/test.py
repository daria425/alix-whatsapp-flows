from services.AI_Service import VertexAI_Service
import json

# Function to read JSON data from file
def read_json_file(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data

def create_input_text(option):
    website=option["Website"]
    if option["Local / National"]=="National":
        location=option["Local / National"]
    else:
        location=option["Postcode"]
    description=option["Short text description"]
    name=option["Name"]
    result={"website": website, "location": location, "description": description, "name": name}
    return result

file_path="/home/vboxuser/repos/ai_signposting/ai_api/data/sample_option_messages_local.json"
options=read_json_file(file_path)
option_summaries=[create_input_text(option) for option in options]
service=VertexAI_Service("vertexai", "gemini-1.5-flash-001")
list_items=json.dumps(option_summaries)
for item in list_items:
    prompt=f""" 
        This is a dictionary representing information on a support organization within the UK. 
        Using all of the information, write a description of the organization. 
        Make sure all details written in the dictionary are included. 
        Mention the name first. Include any additional details if you have knowledge of them. Keep your answer in the range of 3 sentences.
        Organization dictionary:
        {item}
        """
    response = service.get_model_response(
       prompt,
        {"temperature": 0.5},
    )
