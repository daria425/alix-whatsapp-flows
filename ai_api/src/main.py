from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import llm
app = FastAPI()

origins=[
  "http://localhost:8080", "https://ai-signposting.nw.r.appspot.com"
]

app.add_middleware(    
   CORSMiddleware,
   allow_origins=origins,
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],)

@app.get("/")
def main():
    return {"message": "Hello World"}


app.include_router(llm.router)