#!/bin/bash
echo "Starting FastAPI server with Uvicorn..."
uvicorn src.main:app --reload