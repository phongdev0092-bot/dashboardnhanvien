import os
import sys
import traceback

# Thêm thư mục gốc vào sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse

    app = FastAPI(title="Vercel Diagnostic App")
    err_msg = str(e)
    err_tb = traceback.format_exc()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    def error_catcher(full_path: str):
        return HTMLResponse(
            status_code=500,
            content=f"""
            <!DOCTYPE html>
            <html>
            <head><title>Vercel Startup Error</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; line-height: 1.6;">
                <div style="max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 8px; padding: 2rem; border: 1px solid #334155;">
                    <h1 style="color: #ef4444; margin-top: 0;">Vercel Python Startup Error</h1>
                    <p style="font-size: 1.1rem;"><strong>Exception:</strong> <code style="background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #f43f5e;">{err_msg}</code></p>
                    <h3>Traceback:</h3>
                    <pre style="background: #0f172a; padding: 1.2rem; border-radius: 6px; overflow-x: auto; color: #38bdf8; font-size: 0.85rem; border: 1px solid #334155;">{err_tb}</pre>
                    <h3>System Info:</h3>
                    <p>Python Version: {sys.version}<br/>Current Directory: {os.getcwd()}<br/>sys.path: {sys.path}</p>
                </div>
            </body>
            </html>
            """
        )
