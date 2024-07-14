from pydantic import BaseModel
from typing import List
from .Options import Option

class RequestModel(BaseModel):
    options: List[Option]
    postcode: str
    language: str