import os
import sys
import traceback

# Thêm thư mục gốc và thư mục hiện tại vào sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Cố gắng nạp app từ main
try:
    from main import app as main_app
    app = main_app
except Exception as e:
    from fastapi import FastAPI, Request
    from fastapi.responses import HTMLResponse

    app = FastAPI(title="Vercel Diagnostic Handler")
    err_msg = str(e)
    err_tb = traceback.format_exc()

    def error_response():
        return HTMLResponse(
            status_code=500,
            content=f"""
            <!DOCTYPE html>
            <html>
            <head><title>Vercel Deployment Diagnostic</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; line-height: 1.6;">
                <div style="max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 8px; padding: 2rem; border: 1px solid #334155;">
                    <h1 style="color: #ef4444; margin-top: 0;">Vercel Python Startup Error Traceback</h1>
                    <p style="font-size: 1.1rem;"><strong>Exception:</strong> <code style="background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #f43f5e;">{err_msg}</code></p>
                    <h3>Full Traceback:</h3>
                    <pre style="background: #0f172a; padding: 1.2rem; border-radius: 6px; overflow-x: auto; color: #38bdf8; font-size: 0.85rem; border: 1px solid #334155;">{err_tb}</pre>
                    <h3>Environment Info:</h3>
                    <p style="font-size: 0.85rem; color: #94a3b8;">
                        Python: {sys.version}<br/>
                        Working Directory: {os.getcwd()}<br/>
                        BASE_DIR: {BASE_DIR}<br/>
                        sys.path: {sys.path}
                    </p>
                </div>
            </body>
            </html>
            """
        )

    @app.get("/")
    def handle_root():
        return error_response()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    def handle_all(full_path: str = ""):
        return error_response()
