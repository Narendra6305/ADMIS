import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.abspath("logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "admis.log")

# Setup root ADMIS logger
logger = logging.getLogger("admis")
logger.setLevel(logging.INFO)

if not logger.handlers:
    # 1. Console Stream Handler
    c_handler = logging.StreamHandler()
    c_handler.setLevel(logging.INFO)
    c_format = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    c_handler.setFormatter(c_format)
    logger.addHandler(c_handler)

    # 2. Rotating File Handler (5 MB per file, max 3 backups)
    f_handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=3, encoding="utf-8")
    f_handler.setLevel(logging.INFO)
    f_format = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    f_handler.setFormatter(f_format)
    logger.addHandler(f_handler)

def get_latest_logs(lines: int = 100) -> str:
    """Reads the last N lines from admis.log for API inspection."""
    if not os.path.exists(LOG_FILE):
        return "No log file created yet."
    try:
        with open(LOG_FILE, "r", encoding="utf-8", errors="ignore") as f:
            all_lines = f.readlines()
            return "".join(all_lines[-lines:])
    except Exception as e:
        return f"Error reading log file: {e}"
