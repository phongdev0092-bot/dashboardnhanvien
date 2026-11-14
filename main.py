"""
Main application file - FastAPI Web Dashboard Quản lý Nhân sự
Đọc dữ liệu trực tiếp từ Google Sheets và render theo phong cách shadcn/ui
Hỗ trợ đầy đủ các thao tác Thêm / Sửa / Xóa nhân viên
Hoàn toàn tương thích Vercel Serverless Function & Local Development
"""

import os
import sys
import hashlib
import traceback
from typing import Optional, Dict, Any
from fastapi import FastAPI, Request, Form, status, Body
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

from services.sheets import sheets_service

# Nạp biến môi trường từ .env
load_dotenv()

APP_HOST = os.getenv("HOST", "127.0.0.1")
APP_PORT = int(os.getenv("PORT", "8000"))
DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD", "").strip()
SESSION_SECRET = os.getenv("SESSION_SECRET", "secret-token-key-2026-dashboard")
COOKIE_NAME = "dashboard_auth"

# Tìm thư mục static và templates linh hoạt cho môi trường Serverless
def get_resource_dir(name: str) -> str:
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), name),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "api", name),
        os.path.join(os.getcwd(), name),
        os.path.join(os.getcwd(), "api", name),
        f"/var/task/{name}",
        f"/var/task/api/{name}"
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), name)

STATIC_DIR = get_resource_dir("static")
TEMPLATES_DIR = get_resource_dir("templates")

app = FastAPI(
    title="Employee Dashboard - Google Sheets Live",
    description="Dashboard quản lý nhân sự trực tiếp từ Google Sheets với phong cách shadcn/ui",
    version="1.3.0"
)

# Gắn thư mục tĩnh (CSS, JS) an toàn
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Khởi tạo Jinja2 Templates an toàn
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Bắt lỗi toàn cục để hiển thị rõ ràng trên Vercel nếu có sự cố
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    return HTMLResponse(
        status_code=500,
        content=f"""
        <!DOCTYPE html>
        <html>
        <head><title>500 Internal Server Error</title></head>
        <body style="font-family: monospace; padding: 24px; background: #fff1f2; color: #881337; line-height: 1.5;">
            <div style="max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; border: 1px solid #fecdd3; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color: #e11d48; margin-top: 0;">500 Internal Server Error (Debug Mode)</h2>
                <p><b>Exception:</b> {type(exc).__name__}: {str(exc)}</p>
                <h3>Traceback:</h3>
                <pre style="background: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; border: 1px solid #e2e8f0; font-size: 13px;">{tb}</pre>
                <p style="font-size: 12px; color: #64748b;">TEMPLATES_DIR: {TEMPLATES_DIR} (exists: {os.path.isdir(TEMPLATES_DIR)})<br/>STATIC_DIR: {STATIC_DIR} (exists: {os.path.isdir(STATIC_DIR)})</p>
            </div>
        </body>
        </html>
        """
    )

def is_auth_enabled() -> bool:
    """Kiểm tra có cấu hình mật khẩu truy cập dashboard không."""
    return bool(DASHBOARD_PASSWORD)

def get_auth_token() -> str:
    """Tạo token phiên đăng nhập từ password và session secret."""
    raw = f"{DASHBOARD_PASSWORD}:{SESSION_SECRET}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def check_authenticated(request: Request) -> bool:
    """Kiểm tra xem người dùng đã đăng nhập chưa."""
    if not is_auth_enabled():
        return True
    cookie_token = request.cookies.get(COOKIE_NAME)
    return cookie_token == get_auth_token()

def render_template(request: Request, name: str, context: Dict[str, Any]):
    """Helper render template tương thích mọi phiên bản Starlette."""
    # Đảm bảo request luôn có trong context dictionary
    ctx = dict(context)
    ctx["request"] = request
    try:
        # Starlette >= 0.38
        return templates.TemplateResponse(request, name, ctx)
    except Exception:
        # Starlette < 0.38
        return templates.TemplateResponse(name, ctx)

# Route Trang chủ Dashboard
@app.get("/", response_class=HTMLResponse)
def get_dashboard(request: Request):
    if not check_authenticated(request):
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    return render_template(
        request,
        "dashboard.html",
        {
            "auth_enabled": is_auth_enabled(),
            "sheet_id": sheets_service.sheet_id,
            "sheet_gid": sheets_service.sheet_gid
        }
    )

# Route Đăng nhập
@app.get("/login", response_class=HTMLResponse)
def get_login_page(request: Request):
    if not is_auth_enabled() or check_authenticated(request):
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    return render_template(request, "login.html", {"error": None})

@app.post("/login", response_class=HTMLResponse)
def handle_login(request: Request, password: str = Form(...)):
    if not is_auth_enabled():
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    if password == DASHBOARD_PASSWORD:
        response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
        response.set_cookie(
            key=COOKIE_NAME,
            value=get_auth_token(),
            httponly=True,
            max_age=86400 * 7,
            samesite="lax"
        )
        return response

    return render_template(
        request,
        "login.html",
        {"error": "Mật khẩu không chính xác, vui lòng thử lại."}
    )

# Route Đăng xuất
@app.get("/logout")
def handle_logout():
    response = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(COOKIE_NAME)
    return response

# API Lấy dữ liệu nhân viên (dùng cache)
@app.get("/api/data")
def api_get_data(request: Request):
    if not check_authenticated(request):
        return JSONResponse(status_code=401, content={"success": False, "error": "Chưa xác thực"})
    
    result = sheets_service.get_data(force_refresh=False)
    return JSONResponse(content=result)

# API Làm mới dữ liệu ngay lập tức (bỏ qua cache)
@app.post("/api/refresh")
def api_refresh_data(request: Request):
    if not check_authenticated(request):
        return JSONResponse(status_code=401, content={"success": False, "error": "Chưa xác thực"})
    
    result = sheets_service.get_data(force_refresh=True)
    return JSONResponse(content=result)

# API Thêm nhân viên mới
@app.post("/api/employees")
def api_create_employee(request: Request, employee: Dict[str, Any] = Body(...)):
    if not check_authenticated(request):
        return JSONResponse(status_code=401, content={"success": False, "error": "Chưa xác thực"})

    if not employee.get("Họ Tên NV"):
        return JSONResponse(status_code=400, content={"success": False, "error": "Họ và tên nhân viên là bắt buộc."})

    new_emp = sheets_service.add_employee(employee)
    return JSONResponse(content={"success": True, "data": new_emp, "message": "Thêm nhân viên thành công!"})

# API Cập nhật thông tin nhân viên
@app.put("/api/employees/{emp_id}")
def api_update_employee(emp_id: str, request: Request, employee: Dict[str, Any] = Body(...)):
    if not check_authenticated(request):
        return JSONResponse(status_code=401, content={"success": False, "error": "Chưa xác thực"})

    updated = sheets_service.update_employee(emp_id, employee)
    if not updated:
        return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy nhân viên."})

    return JSONResponse(content={"success": True, "data": updated, "message": "Cập nhật nhân viên thành công!"})

# API Xóa nhân viên
@app.delete("/api/employees/{emp_id}")
def api_delete_employee(emp_id: str, request: Request):
    if not check_authenticated(request):
        return JSONResponse(status_code=401, content={"success": False, "error": "Chưa xác thực"})

    success = sheets_service.delete_employee(emp_id)
    if not success:
        return JSONResponse(status_code=404, content={"success": False, "error": "Không thể xóa nhân viên."})

    return JSONResponse(content={"success": True, "message": "Xóa nhân viên thành công!"})

# API Khôi phục lại bản gốc từ Google Sheet
@app.post("/api/employees/reset")
def api_reset_mutations(request: Request):
    if not check_authenticated(request):
        return JSONResponse(status_code=401, content={"success": False, "error": "Chưa xác thực"})

    sheets_service.reset_mutations()
    return JSONResponse(content={"success": True, "message": "Đã khôi phục dữ liệu gốc từ Google Sheets!"})

# API Kiểm tra trạng thái hệ thống
@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "sheet_id": sheets_service.sheet_id,
        "sheet_gid": sheets_service.sheet_gid,
        "auth_enabled": is_auth_enabled(),
        "cache_ttl": sheets_service.cache_ttl,
        "templates_dir": TEMPLATES_DIR,
        "static_dir": STATIC_DIR
    }

# Khởi động app khi chạy trực tiếp qua python main.py
if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Dashboard đang khởi chạy tại http://{APP_HOST}:{APP_PORT}")
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=True)
