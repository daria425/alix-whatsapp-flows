from pydantic import BaseModel, Field
from typing import List, Optional, Union

class Option(BaseModel):
    Category_tags: List[str] = Field(..., alias="Category tags")
    Name: str
    Website: str
    Phone_call: Optional[Union[str, int, float]] = Field(None, alias="Phone - call")
    Local_National: str = Field(..., alias="Local / National")
    Postcode: Optional[str] = "N/A"
    Short_text_description: str = Field(..., alias="Short text description")
    Logo_link: str = Field(..., alias="Logo-link")
    Email: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]


   

