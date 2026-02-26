
#-----------------------------------------
# This file is used for chromadb
#-----------------------------------------


# python_api_server.py

#-----------------------------------------------
# Use this FastAPI server to provide backend API for React UI.
# It loads all logic from llm_core.py.
# uvicorn python_api_server:app --host 0.0.0.0 --port 8000
# npm run dev -- --host
# node server.js
#-----------------------------------------------

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Import all logic from llm_core.py
from llm_core import (
    get_llm,
    get_embedder,
    search_training_docs,
    generate_answer,
    scan_and_process_pdfs,
    parse_day_filter,
)

app = FastAPI(title="Finacle LLM API")

# Allow your React UI at http://192.168.1.100:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # (change to your LAN IP in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")

# =============================
# Health check endpoint
# =============================
@app.get("/health")
def health():
    return {"status": "ok"}


#================================
# Model status endpoint
#================================
@app.get("/api/model_status")
def model_status():
    return {"status": "ready"}


# ================================
# Request Models
# ================================
class ChatRequest(BaseModel):
    message: str
    top_k: int = 5
    mode: str = "Quick"


class ProcessDocsRequest(BaseModel):
    force_reprocess: bool = False


# ================================
# API ROUTES
# ================================

@app.post("/api/load_model")
def load_model():
    """Loads LLM + Embedder once on startup."""
    try:
        get_llm()
        get_embedder()
        return {"status": "models_loaded"}
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process_docs")
def process_docs(req: ProcessDocsRequest):
    """Scan all PDFs and embed again if needed."""
    try:
        count = scan_and_process_pdfs(force_reprocess=req.force_reprocess)
        return {"processed_pdfs": count}
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
def chat(req: ChatRequest):
    """Main chat endpoint used by React frontend."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Support ATDAYxx: filtered search
        day_filter, cleaned_query = parse_day_filter(req.message)

        chunks = search_training_docs(cleaned_query, top_k=req.top_k)
        if not chunks:
            return {"answer": "No relevant information found.", "sources": []}

        answer = generate_answer(cleaned_query, chunks)

        # Build frontend—friendly sources list
        sources = []
        for c in chunks:
            md = c["metadata"]
            sources.append({
                "day": md.get("day"),
                "pdf_name": md.get("pdf_name"),
                "chunk_index": md.get("chunk_index"),
            })

        # unique_sources = {}
        # for c in chunks:
        #     md = c["metadata"]
        #     pdf = md.get("pdf_name")
        #     if pdf not in unique_sources:
        #         unique_sources[pdf] = {
        #             "day": md.get("day"),
        #             "pdf_name": pdf,
        #             "chunk_index": md.get("chunk_index"),
        #         }

        # sources = list(unique_sources.values())


        return {
            "answer": answer,
            "sources": sources,
        }


    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


# ================================
# RUN SERVER
# ================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("python_api_server:app", host="0.0.0.0", port=8000, reload=False)
