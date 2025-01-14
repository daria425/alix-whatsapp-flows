from pydantic import BaseModel
from typing import List, Optional
from .Options import Option

class SignpostingRequestModel(BaseModel):
    options: List[Option]
    postcode: Optional[str]=""
    language: Optional[str]="en"
    category: str