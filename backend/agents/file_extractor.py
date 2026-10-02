"""
File Text Extraction Utility
Extracts text content from uploaded files (PDF, DOCX, TXT)
to provide additional context to the CrewAI feasibility agent.
"""

import base64
import io
import traceback


def extract_text_from_files(files: list) -> str:
    """
    Accepts a list of file dicts with keys:
      - name: str (filename)
      - contentBase64: str (base64-encoded file content)
      - contentType: str (MIME type)

    Returns a concatenated string of extracted text from all files.
    """
    if not files:
        return ""

    extracted_sections = []

    for file_info in files:
        name = file_info.get("name", "unknown")
        content_b64 = file_info.get("contentBase64", "")
        content_type = file_info.get("contentType", "")

        if not content_b64:
            continue

        try:
            # Decode base64 to raw bytes
            raw_bytes = base64.b64decode(content_b64)
            text = ""

            if content_type == "application/pdf" or name.lower().endswith(".pdf"):
                text = _extract_pdf(raw_bytes)
            elif content_type in (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
            ) or name.lower().endswith((".docx", ".doc")):
                text = _extract_docx(raw_bytes)
            elif content_type.startswith("text/") or name.lower().endswith(".txt"):
                text = raw_bytes.decode("utf-8", errors="replace")
            else:
                text = f"[File: {name} — type '{content_type}' not supported for text extraction]"

            if text.strip():
                extracted_sections.append(
                    f"--- Content from: {name} ---\n{text.strip()}"
                )

        except Exception as e:
            extracted_sections.append(
                f"--- Could not extract from: {name} (Error: {str(e)}) ---"
            )
            traceback.print_exc()

    return "\n\n".join(extracted_sections)


def _extract_pdf(raw_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyPDF2."""
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(io.BytesIO(raw_bytes))
        pages_text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages_text.append(page_text)
        return "\n".join(pages_text)
    except ImportError:
        return "[PyPDF2 not installed — cannot extract PDF text]"


def _extract_docx(raw_bytes: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    try:
        from docx import Document

        doc = Document(io.BytesIO(raw_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except ImportError:
        return "[python-docx not installed — cannot extract DOCX text]"
