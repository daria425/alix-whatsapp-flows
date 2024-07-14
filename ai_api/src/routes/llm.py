from fastapi import APIRouter
from ..models.RequestModel import RequestModel

router=APIRouter(
    prefix='/llm'
)

@router.post("/")
def call_llm(request_body: RequestModel):
    print("request recieved", request_body)
