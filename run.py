import subprocess
import sys
import time
import os

def main():
    print("==================================================")
    print(" Agenda-Driven Meeting Intelligence System (ADMIS)")
    print("==================================================")

    backend_dir = os.path.abspath("backend")
    frontend_dir = os.path.abspath("frontend")

    print("\n[1/2] Starting FastAPI Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=backend_dir
    )

    print("[2/2] Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["cmd", "/c", "npm", "run", "dev"],
        cwd=frontend_dir
    )

    print("\nADMIS Full-Stack system is up and running!")
    print("-> API & SSE Stream: http://localhost:8000")
    print("-> Web Application UI: http://localhost:5173\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down ADMIS services...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
