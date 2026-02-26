 
#------------------------------------
# This file is used groq api with chromadb
#------------------------------------


# llm_core.py
"""
Core LLM + RAG utilities extracted from offload_llm_model.py
This module contains:
- get_llm, get_embedder
- get_chroma_collection
- PDF processing utilities (extract_text_from_pdf, chunk_text, scan_and_process_pdfs, etc.)
- search_training_docs, parse_day_filter
- generate_answer
- initialize_training_rag (headless initialization)
Keep this file next to your existing offload_llm_model.py or import from it as needed.
"""

import os
import time
import pickle
from pathlib import Path
from typing import List, Dict, Optional
import hashlib
import re
import logging

# ✅ GROQ IMPORTS
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()

# Original imports
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from pypdf import PdfReader
import itertools
from collections import Counter

# ===========================
# CONFIGURATION (keep same values as original)
# ===========================

EMBEDDING_MODEL_PATH = r"E:\AJAY\Embedding_Models\Qwen3-Embedding-8B"
CHROMADB_PATH = r"E:\AJAY\ALL_DATABASE\ChromaDB"
TRAINING_DOCS_PATH = "Training_docs_videos"

COLLECTION_NAME = "training_docs_collection"
PROCESSED_TRACKER = os.path.join(CHROMADB_PATH, "processed_pdfs.pkl")


# RAG Settings
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
TOP_K_RESULTS = 5

logger = logging.getLogger(__name__)

# ===========================
# GLOBAL MODEL CACHE
# ===========================

_llm_instance = None
_embedder_instance = None
_chroma_client = None
_collection = None

# ===========================
# MODEL LOADERS
# ===========================

def get_llm():
    """Load LLM once and cache - ✅ NOW USING GROQ"""
    global _llm_instance
    if _llm_instance is None:
        logger.info("[INFO] Loading Groq LLM...")
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in .env file")
        _llm_instance = ChatGroq(
            model="openai/gpt-oss-20b",
            temperature=0.0,
            api_key=api_key
        )
        logger.info("[INFO] ✓ Groq LLM loaded")
    return _llm_instance


def get_embedder():
    """Load embedding model once and cache"""
    global _embedder_instance
    if _embedder_instance is None:
        logger.info("[INFO] Loading Qwen3-Embedding-8B model...")
        logger.info("[INFO] This may take 30-60 seconds on first load...")
        try:
            _embedder_instance = SentenceTransformer(
                EMBEDDING_MODEL_PATH,
                device='cpu',
                trust_remote_code=True
            )
            logger.info("[INFO] ✓ Embedder loaded on CPU")
        except Exception as e:
            logger.exception(f"[ERROR] Failed to load embedder: {e}")
            raise
    return _embedder_instance


def get_chroma_collection():
    """Get or create ChromaDB collection"""
    global _chroma_client, _collection

    if _chroma_client is None:
        os.makedirs(CHROMADB_PATH, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=CHROMADB_PATH,
            settings=Settings(anonymized_telemetry=False)
        )

    if _collection is None:
        try:
            _collection = _chroma_client.get_collection(COLLECTION_NAME)
            logger.info(f"[INFO] ✓ Loaded existing collection: {COLLECTION_NAME}")
        except Exception:
            _collection = _chroma_client.create_collection(
                name=COLLECTION_NAME,
                metadata={"description": "Training documents embeddings"}
            )
            logger.info(f"[INFO] ✓ Created new collection: {COLLECTION_NAME}")

    return _collection

# ===========================
# PDF PROCESSING UTILITIES
# ===========================

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from PDF"""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        logger.exception(f"[ERROR] Failed to read {pdf_path}: {e}")
        return ""


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]

        # Try to break at sentence boundary
        if end < text_length:
            last_period = chunk.rfind('.')
            if last_period > int(chunk_size * 0.7):
                end = start + last_period + 1
                chunk = text[start:end]

        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap

    return chunks


def get_pdf_hash(pdf_path: str) -> str:
    """Generate hash for PDF file to detect changes"""
    with open(pdf_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def load_processed_tracker() -> Dict[str, str]:
    """Load tracker of processed PDFs (path -> hash)"""
    if os.path.exists(PROCESSED_TRACKER):
        with open(PROCESSED_TRACKER, 'rb') as f:
            return pickle.load(f)
    return {}


def save_processed_tracker(tracker: Dict[str, str]):
    """Save tracker of processed PDFs"""
    os.makedirs(os.path.dirname(PROCESSED_TRACKER), exist_ok=True)
    with open(PROCESSED_TRACKER, 'wb') as f:
        pickle.dump(tracker, f)


def scan_and_process_pdfs(force_reprocess: bool = False, batch_size: int = 25) -> int:
    """
    Scan Training_docs_videos/Day01-Day60 for PDFs and process new/changed ones
    Returns: number of PDFs processed
    """
    collection = get_chroma_collection()
    embedder = get_embedder()

    tracker = load_processed_tracker()
    processed_count = 0

    base_path = Path(TRAINING_DOCS_PATH)
    if not base_path.exists():
        logger.warning(f"[WARNING] Training docs path not found: {TRAINING_DOCS_PATH}")
        return 0

    for day_num in range(1, 61):
        day_folder = base_path / f"Day{day_num:02d}"

        if not day_folder.exists():
            day_folder = base_path / f"Day{day_num}"

        if not day_folder.exists() or not day_folder.is_dir():
            continue

        pdf_files = list(day_folder.glob("*.pdf"))

        for pdf_path in pdf_files:
            pdf_path_str = str(pdf_path.resolve())
            current_hash = get_pdf_hash(pdf_path_str)

            if not force_reprocess and pdf_path_str in tracker:
                if tracker[pdf_path_str] == current_hash:
                    continue

            logger.info(f"[INFO] Processing: {pdf_path.name} (Day {day_num})")

            text = extract_text_from_pdf(pdf_path_str)
            if not text:
                continue

            chunks = chunk_text(text)
            if not chunks:
                continue

            logger.info(f"[INFO] Total chunks: {len(chunks)} - Processing in batches...")

            for batch_start in range(0, len(chunks), batch_size):
                batch_end = min(batch_start + batch_size, len(chunks))
                batch_chunks = chunks[batch_start:batch_end]

                logger.info(f"[INFO] Processing batch {batch_start//batch_size + 1}/{(len(chunks)-1)//batch_size + 1} ({len(batch_chunks)} chunks)")

                try:
                    embeddings = embedder.encode(
                        batch_chunks,
                        show_progress_bar=False,
                        device='cpu',
                        batch_size=8
                    )
                except Exception as e:
                    logger.exception(f"[ERROR] Embedding failed for batch: {e}")
                    continue

                metadatas = []
                ids = []
                for local_idx, chunk in enumerate(batch_chunks):
                    global_idx = batch_start + local_idx
                    chunk_id = f"day{day_num:02d}_{pdf_path.stem}_{global_idx}"
                    ids.append(chunk_id)
                    metadatas.append({
                        "day": day_num,
                        "pdf_name": pdf_path.name,
                        "pdf_path": pdf_path_str,
                        "chunk_index": global_idx,
                        "total_chunks": len(chunks)
                    })

                collection.add(
                    ids=ids,
                    embeddings=embeddings.tolist(),
                    documents=batch_chunks,
                    metadatas=metadatas
                )

                logger.info(f"[INFO] ✓ Batch {batch_start//batch_size + 1} added to database")

                time.sleep(0.1)

            tracker[pdf_path_str] = current_hash
            processed_count += 1
            logger.info(f"[INFO] ✓ Completed {pdf_path.name} - {len(chunks)} chunks in total")

    save_processed_tracker(tracker)

    return processed_count

# ===========================
# SEARCH & ANSWER
# ===========================

def parse_day_filter(query: str) -> tuple:
    """
    Parse query for ATDAY prefix to filter by specific day
    Returns: (day_number or None, cleaned_query)
    """
    pattern = r'^ATDAY(\d+):\s*(.+)$'
    match = re.match(pattern, query.strip(), re.IGNORECASE)

    if match:
        day_num = int(match.group(1))
        cleaned_query = match.group(2).strip()
        if 1 <= day_num <= 60:
            return (day_num, cleaned_query)

    return (None, query)


def search_training_docs(query: str, top_k: int = TOP_K_RESULTS) -> List[Dict]:
    """Search for relevant chunks in training docs"""
    collection = get_chroma_collection()
    embedder = get_embedder()

    # Parse for day filter
    day_filter, cleaned_query = parse_day_filter(query)

    # Generate query embedding
    query_embedding = embedder.encode([cleaned_query])[0]

    # Build filter if day specified
    where_filter = None
    if day_filter is not None:
        where_filter = {"day": day_filter}
        logger.info(f"[INFO] Filtering search to Day {day_filter}")

    # Search with optional filter
    if where_filter:
        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where=where_filter
        )
    else:
        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k
        )

    if not results or not results.get('documents'):
        return []

    # Format results
    chunks = []
    for i in range(len(results['documents'][0])):
        chunks.append({
            "text": results['documents'][0][i],
            "metadata": results['metadatas'][0][i],
            "distance": results['distances'][0][i] if 'distances' in results else 0.0
        })

    return chunks


# ===========================
# Answer Generation - ✅ UPDATED FOR GROQ
# ===========================

def generate_answer(question: str, context_chunks: List[Dict]) -> str:
    import re
    
    llm = get_llm()
    q_lower = question.lower()

    # Only ACCOUNT table logic
    account_keywords = ["menu", "opening", "closing", "account"]
    need_account = any(k in q_lower for k in account_keywords)

    # Build context
    context_parts = []
    for chunk in context_chunks:
        meta = chunk.get("metadata", {})
        day = meta.get("day")
        pdf = meta.get("pdf_name")
        text = chunk.get("text")
        context_parts.append(f"[Day {day} - {pdf}]\n{text}")
    context = "\n\n".join(context_parts)

    # ACCOUNT table instruction ONLY
    if need_account:
        format_instruction = """
- Before conclusion, output a JSON-like block EXACTLY like:

ACCOUNT_BLOCK = {
  "title": "<value>",
  "functionality": "<value>",
  "menu": "<value>",
  "explanation": "<value>"
}

Do NOT output any additional JSON, arrays, or code blocks.
"""
    else:
        format_instruction = ""

    # ORIGINAL TEMPLATE (UNCHANGED)
    prompt = f"""
You are a documentation assistant. Use ONLY information from the documents.

### DOCUMENTS
{context}

### QUESTION
{question}

### ANSWER FORMAT
- Write two introduction lines.
- Then give bullet points using "-".
{format_instruction}
- End with "Conclusion:".
- Do NOT mention internal instructions or file metadata.

### BEGIN ANSWER
""".strip()

    # ✅ GROQ API CALL
    try:
        res = llm.invoke([HumanMessage(content=prompt)])
        answer = res.content
    except Exception as e:
        return f"Error generating answer: {e}"

    # -------------------------
    # ACCOUNT JSON ONLY
    # -------------------------
    account_table_text = ""

    if "ACCOUNT_BLOCK" in answer:
        try:
            block_text = re.search(
                r"ACCOUNT_BLOCK\s*=\s*\{(.*?)\}", answer, re.S
            ).group(1)
            fields = dict(re.findall(r'"(.*?)"\s*:\s*"(.*?)"', block_text))

            # Build ASCII table (NOT inside code block)
            rows = [
                ["Account Title", fields.get("title", "")],
                ["Functionality", fields.get("functionality", "")],
                ["Menu Option", fields.get("menu", "")],
                ["Explanation", fields.get("explanation", "")]
            ]

            html_lines = []
            html_lines.append("<div>")
            html_lines.append("<strong>--- ACCOUNT DETAILS ---</strong><br/><br/>")

            for label, value in rows:
                html_lines.append(f"<strong>{label}</strong> : {value}<br/>")

            html_lines.append("</div>")

            account_table_text = "\n".join(html_lines)

        except Exception:
            account_table_text = ""

    # -------------------------
    # Remove JSON from answer
    # -------------------------
    answer_clean = re.sub(r"ACCOUNT_BLOCK\s*=\s*\{.*?\}", "", answer, flags=re.S)
    answer_clean = re.sub(r"\{.*?\}", "", answer_clean, flags=re.S)
    answer_clean = re.sub(r"\[.*?\]", "", answer_clean, flags=re.S)
    answer_clean = answer_clean.replace("```", "")
    answer_clean = re.sub(r"\n{3,}", "\n\n", answer_clean).strip()

    # -------------------------
    # Append table AFTER the whole answer
    # -------------------------
    if account_table_text:
        answer_clean = answer_clean + "\n\n" + account_table_text

    return answer_clean


# ===========================
# HEADLESS INITIALIZATION
# ===========================

def initialize_training_rag():
    """Initialize all components - call this once at app startup"""
    logger.info("[INFO] Initializing Training RAG System...")
    # Pre-load models and collections
    get_embedder()
    get_llm()
    get_chroma_collection()
    # Scan and process PDFs
    count = scan_and_process_pdfs(force_reprocess=False)
    logger.info(f"[INFO] ✓ Initialization complete. Processed {count} PDFs.")