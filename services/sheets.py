"""
Service đọc, chuẩn hóa, lưu bộ nhớ đệm (cache), xử lý dữ liệu và hỗ trợ Thêm / Sửa / Xóa nhân viên
Hỗ trợ cả pandas và thư viện csv tiêu chuẩn để tối ưu tuyệt đối cho Serverless (Vercel / Lambda)
"""

import os
import re
import io
import csv
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import requests
from dotenv import load_dotenv

# Hỗ trợ pandas an toàn (nếu môi trường serverless gặp lỗi nhị phân, tự động dùng csv tiêu chuẩn)
try:
    import pandas as pd
    HAS_PANDAS = True
except Exception:
    HAS_PANDAS = False

load_dotenv()

# Danh sách chuẩn 30 cột theo yêu cầu
EXPECTED_COLUMNS: List[str] = [
    "STT", "Vùng", "Đối tác", "Block", "Họ Tên NV", "Mã NV",
    "Inside Account", "Password", "CMND", "Địa chỉ", "Email",
    "Số điện thoại", "Tình trạng Tài khoản", "Tình trạng Hợp đồng",
    "Chức danh", "Điều hành", "Loại HĐLĐ", "Phân công", "Tính lương",
    "Tọa độ", "Vị trí phụ trách", "Hình ảnh", "Hỗ trợ",
    "Mã NV Đội trưởng", "Họ tên Đội trưởng", "Số điện thoại FRT",
    "Ngày Vô Công Ty", "Ngày làm Việc Cuối", "Mobisale", "Roles"
]

IS_SERVERLESS = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if IS_SERVERLESS:
    DATA_DIR = "/tmp/data"
else:
    DATA_DIR = os.path.join(BASE_DIR, "data")

MUTATIONS_FILE = os.path.join(DATA_DIR, "local_mutations.json")

class SheetsService:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID", "17QLc9SlfpPPrR-d1R2BkBxA7DmCI5ZCuhmQffP5F6pY")
        self.sheet_gid = os.getenv("GOOGLE_SHEET_GID", "32204814")
        self.cache_ttl = int(os.getenv("CACHE_TTL_SECONDS", "300"))
        self.show_sensitive = os.getenv("SHOW_SENSITIVE", "false").lower() in ("true", "1", "yes")

        self._base_data: Optional[List[Dict[str, Any]]] = None
        self._cached_data: Optional[List[Dict[str, Any]]] = None
        self._last_updated: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._data_source: str = "Chưa nạp"
        self._is_sample: bool = False

        try:
            os.makedirs(DATA_DIR, exist_ok=True)
        except Exception:
            pass

        self._mutations = self._load_mutations()

    @property
    def csv_url(self) -> str:
        return f"https://docs.google.com/spreadsheets/d/{self.sheet_id}/export?format=csv&gid={self.sheet_gid}"

    def _load_mutations(self) -> Dict[str, Any]:
        if os.path.exists(MUTATIONS_FILE):
            try:
                with open(MUTATIONS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"deleted_ids": [], "updated_records": {}, "added_records": []}

    def _save_mutations(self):
        try:
            os.makedirs(os.path.dirname(MUTATIONS_FILE), exist_ok=True)
            with open(MUTATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._mutations, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def normalize_column_name(self, col: str) -> str:
        cleaned = re.sub(r'[\r\n\t]+', ' ', str(col))
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        for expected in EXPECTED_COLUMNS:
            if cleaned.lower() == expected.lower():
                return expected
        return cleaned

    def parse_csv_text_to_records(self, csv_text: str) -> List[Dict[str, str]]:
        """Chuyển đổi text CSV thành danh sách dict chuẩn 30 cột với dtype=str."""
        if HAS_PANDAS:
            try:
                df = pd.read_csv(io.StringIO(csv_text), dtype=str, keep_default_na=False, skipinitialspace=True)
                df.columns = [self.normalize_column_name(c) for c in df.columns]
                df = df.dropna(how="all")
                df = df.fillna("").astype(str)
                df = df.map(lambda x: x.strip() if isinstance(x, str) else str(x).strip())
                for col in EXPECTED_COLUMNS:
                    if col not in df.columns:
                        df[col] = ""
                df = df[EXPECTED_COLUMNS]
                records = df.to_dict(orient="records")
                return [r for r in records if any(r.get(k) for k in ["Họ Tên NV", "Mã NV", "STT", "Email"])]
            except Exception:
                pass

        # Bộ đọc CSV tiêu chuẩn (dự phòng độc lập không phụ thuộc pandas)
        f = io.StringIO(csv_text.strip())
        reader = csv.reader(f)
        try:
            raw_headers = next(reader)
        except StopIteration:
            return []

        headers = [self.normalize_column_name(h) for h in raw_headers]
        records = []
        for row in reader:
            if not row or all(not str(c).strip() for c in row):
                continue
            rec = {col: "" for col in EXPECTED_COLUMNS}
            for idx, col in enumerate(headers):
                if col in rec and idx < len(row):
                    rec[col] = str(row[idx]).strip()
            if any(rec.get(k) for k in ["Họ Tên NV", "Mã NV", "STT", "Email"]):
                records.append(rec)
        return records

    def _fetch_from_google_sheet(self) -> Tuple[List[Dict[str, str]], bool, Optional[str]]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/csv,application/csv,text/plain;q=0.9,*/*;q=0.8"
        }
        try:
            resp = requests.get(self.csv_url, headers=headers, timeout=8, allow_redirects=True)
            content_type = resp.headers.get("Content-Type", "")
            first_bytes = resp.content[:500].decode("utf-8", errors="ignore").lower()
            
            if "html" in content_type or "<html" in first_bytes or "servicelogin" in first_bytes or "accounts.google.com" in first_bytes:
                err_msg = (
                    "Quyền truy cập Google Sheet bị từ chối (Trang yêu cầu đăng nhập Google). "
                    "Vui lòng mở Google Sheet -> Bấm nút 'Chia sẻ' (Share) góc trên bên phải -> "
                    "Đổi chế độ thành 'Bất kỳ ai có đường liên kết đều có thể xem' (Anyone with the link can view)."
                )
                return [], False, err_msg
            
            if resp.status_code != 200:
                err_msg = f"Không thể tải dữ liệu từ Google Sheets (Mã lỗi HTTP {resp.status_code})."
                return [], False, err_msg

            csv_text = resp.content.decode("utf-8-sig", errors="replace")
            records = self.parse_csv_text_to_records(csv_text)
            return records, True, None

        except requests.exceptions.RequestException as e:
            err_msg = f"Lỗi kết nối mạng khi tải Google Sheet: {str(e)}"
            return [], False, err_msg
        except Exception as e:
            err_msg = f"Lỗi xử lý file CSV từ Google Sheet: {str(e)}"
            return [], False, err_msg

    def _load_fallback_sample(self) -> Tuple[List[Dict[str, str]], str]:
        candidates = [
            os.path.join(BASE_DIR, "sample_data", "employees_sample.csv"),
            os.path.join(os.getcwd(), "sample_data", "employees_sample.csv"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data", "employees_sample.csv"),
            "/var/task/sample_data/employees_sample.csv"
        ]
        for p in candidates:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8-sig") as f:
                        records = self.parse_csv_text_to_records(f.read())
                    return records, "Dữ liệu mẫu dự phòng (Sample fallback)"
                except Exception:
                    pass
        return [], "Trống"

    def _get_record_id(self, r: Dict[str, Any], fallback_idx: int = 0) -> str:
        ma_nv = str(r.get("Mã NV", "")).strip()
        if ma_nv:
            return ma_nv
        inside = str(r.get("Inside Account", "")).strip()
        if inside:
            return inside
        stt = str(r.get("STT", "")).strip()
        if stt:
            return f"id_stt_{stt}"
        return f"id_gen_{fallback_idx}"

    def _merge_mutations(self, base_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        deleted_ids = set(self._mutations.get("deleted_ids", []))
        updated_records = self._mutations.get("updated_records", {})
        added_records = self._mutations.get("added_records", [])

        merged: List[Dict[str, Any]] = []

        for idx, item in enumerate(base_records):
            rec = dict(item)
            rec_id = self._get_record_id(rec, idx)
            rec["_id"] = rec_id

            if rec_id in deleted_ids:
                continue

            if rec_id in updated_records:
                update_val = updated_records[rec_id]
                for k, v in update_val.items():
                    if k != "_id":
                        rec[k] = v

            merged.append(rec)

        for add_idx, item in enumerate(added_records):
            rec = dict(item)
            rec_id = self._get_record_id(rec, 9000 + add_idx)
            rec["_id"] = rec_id

            if rec_id in deleted_ids:
                continue

            if rec_id in updated_records:
                update_val = updated_records[rec_id]
                for k, v in update_val.items():
                    if k != "_id":
                        rec[k] = v

            merged.append(rec)

        for i, r in enumerate(merged, start=1):
            r["STT"] = str(i)

        return merged

    def get_data(self, force_refresh: bool = False) -> Dict[str, Any]:
        now = datetime.now()
        is_cache_valid = (
            not force_refresh 
            and self._base_data is not None 
            and self._last_updated is not None 
            and (now - self._last_updated).total_seconds() < self.cache_ttl
        )

        if not is_cache_valid:
            records, success, error_msg = self._fetch_from_google_sheet()
            if success and records:
                self._base_data = records
                self._last_updated = now
                self._last_error = None
                self._data_source = "Google Sheets Trực tiếp"
                self._is_sample = False
            else:
                if self._base_data is None:
                    sample_records, source_desc = self._load_fallback_sample()
                    self._base_data = sample_records
                    self._last_updated = now
                    self._last_error = error_msg
                    self._data_source = source_desc
                    self._is_sample = True
                else:
                    self._last_error = error_msg

        merged_data = self._merge_mutations(self._base_data or [])
        self._cached_data = merged_data

        return {
            "success": True,
            "data": self._cached_data,
            "columns": EXPECTED_COLUMNS,
            "total": len(self._cached_data),
            "last_updated": self._last_updated.strftime("%H:%M:%S %d/%m/%Y") if self._last_updated else "",
            "last_updated_iso": self._last_updated.isoformat() if self._last_updated else "",
            "is_cached": is_cache_valid,
            "cache_ttl": self.cache_ttl,
            "source": self._data_source,
            "is_sample": self._is_sample,
            "error": self._last_error,
            "filter_options": self.extract_filter_options(self._cached_data),
            "stats": self.calculate_stats(self._cached_data),
            "show_sensitive": self.show_sensitive,
            "mutations_count": {
                "added": len(self._mutations.get("added_records", [])),
                "updated": len(self._mutations.get("updated_records", {})),
                "deleted": len(self._mutations.get("deleted_ids", []))
            }
        }

    def add_employee(self, data: Dict[str, Any]) -> Dict[str, Any]:
        new_emp: Dict[str, str] = {col: str(data.get(col, "")).strip() for col in EXPECTED_COLUMNS}
        if not new_emp["Mã NV"]:
            new_emp["Mã NV"] = f"NV{datetime.now().strftime('%y%m%d%H%M%S')}"

        rec_id = new_emp["Mã NV"]
        new_emp["_id"] = rec_id

        added_list = self._mutations.get("added_records", [])
        added_list.append(new_emp)
        self._mutations["added_records"] = added_list
        self._save_mutations()

        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)

        return new_emp

    def update_employee(self, emp_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        emp_id = str(emp_id).strip()
        if not emp_id:
            return None

        added_records = self._mutations.get("added_records", [])
        found_in_added = False
        for idx, item in enumerate(added_records):
            item_id = str(item.get("_id") or item.get("Mã NV") or "")
            if item_id == emp_id:
                for col in EXPECTED_COLUMNS:
                    if col in data:
                        item[col] = str(data[col]).strip()
                added_records[idx] = item
                found_in_added = True
                break

        if found_in_added:
            self._mutations["added_records"] = added_records
        else:
            updated = self._mutations.get("updated_records", {})
            current_vals = updated.get(emp_id, {})
            for col in EXPECTED_COLUMNS:
                if col in data:
                    current_vals[col] = str(data[col]).strip()
            updated[emp_id] = current_vals
            self._mutations["updated_records"] = updated

        self._save_mutations()

        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)

        for r in (self._cached_data or []):
            if str(r.get("_id")) == emp_id or str(r.get("Mã NV")) == emp_id:
                return r

        return data

    def delete_employee(self, emp_id: str) -> bool:
        emp_id = str(emp_id).strip()
        if not emp_id:
            return False

        added_records = self._mutations.get("added_records", [])
        new_added = [r for r in added_records if str(r.get("_id") or r.get("Mã NV")) != emp_id]
        self._mutations["added_records"] = new_added

        deleted_ids = set(self._mutations.get("deleted_ids", []))
        deleted_ids.add(emp_id)
        self._mutations["deleted_ids"] = list(deleted_ids)

        updated_records = self._mutations.get("updated_records", {})
        if emp_id in updated_records:
            del updated_records[emp_id]
            self._mutations["updated_records"] = updated_records

        self._save_mutations()

        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)

        return True

    def reset_mutations(self) -> bool:
        self._mutations = {"deleted_ids": [], "updated_records": {}, "added_records": []}
        self._save_mutations()
        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)
        return True

    def extract_filter_options(self, records: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        keys = ["Vùng", "Đối tác", "Block", "Chức danh", "Tình trạng Hợp đồng", "Tình trạng Tài khoản", "Loại HĐLĐ"]
        options = {k: set() for k in keys}
        for r in records:
            for k in keys:
                val = str(r.get(k, "")).strip()
                if val:
                    options[k].add(val)
        return {k: sorted(list(v)) for k, v in options.items()}

    def calculate_stats(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        total = len(records)
        working_count = 0
        resigned_count = 0
        active_account_count = 0
        regions = set()

        for r in records:
            end_date = str(r.get("Ngày làm Việc Cuối", "")).strip()
            account_status = str(r.get("Tình trạng Tài khoản", "")).strip().lower()
            region = str(r.get("Vùng", "")).strip()

            if region:
                regions.add(region)
            if end_date:
                resigned_count += 1
            else:
                working_count += 1

            if "hoạt động" in account_status or "active" in account_status:
                active_account_count += 1

        return {
            "total": total,
            "working": working_count,
            "resigned": resigned_count,
            "active_accounts": active_account_count,
            "region_count": len(regions)
        }

sheets_service = SheetsService()
