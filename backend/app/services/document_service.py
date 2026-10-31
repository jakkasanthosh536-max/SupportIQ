import os
import re
from typing import List, Tuple
from pypdf import PdfReader
from docx import Document as DocxDocument

def extract_text_from_file(file_path: str, file_type: str) -> Tuple[str, bool, str]:
    """
    Extract text from PDF, DOCX, TXT, or Markdown.
    Returns: (extracted_text, is_success, error_message)
    """
    if not os.path.exists(file_path):
        return "", False, f"File does not exist: {file_path}"

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if file_type:
        ext = file_type.lower().lstrip(".")

    try:
        if ext == "pdf":
            reader = PdfReader(file_path)
            extracted = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    extracted.append(text)
            full_text = "\n\n".join(extracted).strip()
            if not full_text:
                return "", False, "PDF contains no extractable text. Scanned documents or images require OCR."
            return full_text, True, ""

        elif ext in ["docx", "doc"]:
            doc = DocxDocument(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                    if row_text:
                        paragraphs.append(row_text)
            full_text = "\n\n".join(paragraphs).strip()
            if not full_text:
                return "", False, "DOCX file is empty or contains only non-extractable elements."
            return full_text, True, ""

        elif ext in ["txt", "md", "markdown"]:
            encodings = ["utf-8", "latin-1", "cp1252"]
            content = ""
            for enc in encodings:
                try:
                    with open(file_path, "r", encoding=enc) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            full_text = content.strip()
            if not full_text:
                return "", False, "Text/Markdown file is empty."
            return full_text, True, ""

        else:
            return "", False, f"Unsupported file type: .{ext}. Supported types: PDF, DOCX, TXT, MD"

    except Exception as e:
        return "", False, f"Error extracting content: {str(e)}"

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """
    Split text into overlapping chunks respecting paragraph or sentence boundaries where possible.
    """
    cleaned_text = re.sub(r"\r\n", "\n", text)
    cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text).strip()

    if not cleaned_text:
        return []

    # If text is shorter than chunk size, return single chunk
    if len(cleaned_text) <= chunk_size:
        return [cleaned_text]

    chunks = []
    # Split by paragraphs first
    paragraphs = cleaned_text.split("\n\n")
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If paragraph itself is longer than chunk_size, split by sentences or character windows
            if len(para) > chunk_size:
                sentences = re.split(r"(?<=[.!?]) +", para)
                sub_chunk = ""
                for sent in sentences:
                    if len(sub_chunk) + len(sent) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {sent}".strip()
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        if len(sent) > chunk_size:
                            # Hard split with overlap
                            start = 0
                            while start < len(sent):
                                end = min(start + chunk_size, len(sent))
                                chunks.append(sent[start:end])
                                start += (chunk_size - overlap)
                            sub_chunk = ""
                        else:
                            sub_chunk = sent
                if sub_chunk:
                    current_chunk = sub_chunk
                else:
                    current_chunk = ""
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
