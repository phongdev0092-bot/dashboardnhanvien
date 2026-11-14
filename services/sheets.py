"""
Service đọc, chuẩn hóa, lưu bộ nhớ đệm (cache), xử lý dữ liệu và hỗ trợ Thêm / Sửa / Xóa nhân viên
"""

import os
import re
import io
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# Danh sách chuẩn 30 cột theo yêu cầu
EXPECTED_COLUMNS: List[str] = [
    "STT", "Vùng", "Đối tác", "Block", "Họ Tên NV", "Mã NV",
    "Inside Account", "Password", "CMND", "Địa chỉ", "Email",
    "Số điện thoại", "Tình trạng Tài khoản", "Tình trạng Hợp đồng",
    "Chức danh", "Điều hành", "Loại HĐLĐ", "Phân công", "Tính lương",
    "Tọa độ", "V vị trí phụ trách" if False else "Vị trí phụ trách", "Hình ảnh", "Hỗ trợ",
    "Mã NV Đội trưởng", "Họ tên Đội trưởng", "Số điện thoại FRT",
    "Ngày Vô Công Ty", "Ngày làm Việc Cuối", "Mobisale", "Roles"
]

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MUTATIONS_FILE = os.path.join(DATA_DIR, "local_mutations.json")

class SheetsService:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID", "17QLc9SlfpPPrR-d1R2BkBxA7DmCI5ZCuhmQffP5F6pY")
        self.sheet_gid = os.getenv("GOOGLE_SHEET_GID", "32204814")
        self.cache_ttl = int(os.getenv("CACHE_TTL_SECONDS", "300"))
        self.show_sensitive = os.getenv("SHOW_SENSITIVE", "false").lower() in ("true", "1", "yes")

        # Cấu trúc cache
        self._base_data: Optional[List[Dict[str, Any]]] = None
        self._cached_data: Optional[List[Dict[str, Any]]] = None
        self._cached_raw_df: Optional[pd.DataFrame] = None
        self._last_updated: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._data_source: str = "Chưa nạp"
        self._is_sample: bool = False

        # Khởi tạo file lưu trữ thay đổi cục bộ (Thêm / Sửa / Xóa)
        os.makedirs(DATA_DIR, exist_ok=True)
        self._mutations = self._load_mutations()

    @property
    def csv_url(self) -> str:
        return f"https://docs.google.com/spreadsheets/d/{self.sheet_id}/export?format=csv&gid={self.sheet_gid}"

    def _load_mutations(self) -> Dict[str, Any]:
        """Tải các thay đổi cục bộ đã lưu: deleted_ids, updated_records, added_records."""
        if os.path.exists(MUTATIONS_FILE):
            try:
                with open(MUTATIONS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Cảnh báo] Không thể đọc file mutations: {e}")
        return {"deleted_ids": [], "updated_records": {}, "added_records": []}

    def _save_mutations(self):
        """Lưu các thay đổi cục bộ vào file JSON để bảo toàn khi khởi động lại."""
        try:
            with open(MUTATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._mutations, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[Lỗi] Không thể ghi file mutations: {e}")

    def normalize_column_name(self, col: str) -> str:
        """Chuẩn hóa tên cột: xóa ký tự xuống dòng, khoảng trắng thừa."""
        cleaned = re.sub(r'[\r\n\t]+', ' ', str(col))
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        for expected in EXPECTED_COLUMNS:
            if cleaned.lower() == expected.lower():
                return expected
        return cleaned

    def clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Chuẩn hóa DataFrame: ép kiểu str, trim khoảng trắng, đảm bảo 30 cột."""
        df.columns = [self.normalize_column_name(c) for c in df.columns]
        df = df.dropna(how="all")
        df = df.fillna("").astype(str)
        df = df.map(lambda x: x.strip() if isinstance(x, str) else str(x).strip())

        key_cols = [c for c in ["Họ Tên NV", "Mã NV", "STT", "Email"] if c in df.columns]
        if key_cols:
            is_empty_row = df[key_cols].apply(lambda row: all(val == "" for val in row), axis=1)
            df = df[~is_empty_row]

        for col in EXPECTED_COLUMNS:
            if col not in df.columns:
                df[col] = ""

        df = df[EXPECTED_COLUMNS]
        return df

    def _fetch_from_google_sheet(self) -> Tuple[pd.DataFrame, bool, Optional[str]]:
        """Gọi trực tiếp tới Google Sheets export CSV."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/csv,application/csv,text/plain;q=0.9,*/*;q=0.8"
        }
        try:
            resp = requests.get(self.csv_url, headers=headers, timeout=15, allow_redirects=True)
            content_type = resp.headers.get("Content-Type", "")
            first_bytes = resp.content[:500].decode("utf-8", errors="ignore").lower()
            
            if "html" in content_type or "<html" in first_bytes or "servicelogin" in first_bytes or "accounts.google.com" in first_bytes:
                err_msg = (
                    "Quyền truy cập Google Sheet bị từ chối (Trang yêu cầu đăng nhập Google). "
                    "Vui lòng mở Google Sheet -> Bấm nút 'Chia sẻ' (Share) góc trên bên phải -> "
                    "Đổi chế độ thành 'Bất kỳ ai có đường liên kết đều có thể xem' (Anyone with the link can view)."
                )
                return pd.DataFrame(), False, err_msg
            
            if resp.status_code != 200:
                err_msg = f"Không thể tải dữ liệu từ Google Sheets (Mã lỗi HTTP {resp.status_code})."
                return pd.DataFrame(), False, err_msg

            csv_text = resp.content.decode("utf-8-sig", errors="replace")
            df = pd.read_csv(io.StringIO(csv_text), dtype=str, keep_default_na=False, skipinitialspace=True)
            cleaned_df = self.clean_dataframe(df)
            return cleaned_df, True, None

        except requests.exceptions.RequestException as e:
            err_msg = f"Lỗi kết nối mạng khi tải Google Sheet: {str(e)}"
            return pd.DataFrame(), False, err_msg
        except Exception as e:
            err_msg = f"Lỗi xử lý file CSV từ Google Sheet: {str(e)}"
            return pd.DataFrame(), False, err_msg

    def _load_fallback_sample(self) -> Tuple[pd.DataFrame, str]:
        """Tải dữ liệu mẫu dự phòng khi chưa kết nối được Google Sheet."""
        sample_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", "employees_sample.csv")
        if os.path.exists(sample_path):
            df = pd.read_csv(sample_path, dtype=str, keep_default_na=False, skipinitialspace=True)
            return self.clean_dataframe(df), "Dữ liệu mẫu dự phòng (Sample fallback)"
        return pd.DataFrame(columns=EXPECTED_COLUMNS), "Trống"

    def _get_record_id(self, r: Dict[str, Any], fallback_idx: int = 0) -> str:
        """Lấy định danh duy nhất của một nhân viên (ưu tiên Mã NV, Inside Account, hoặc STT)."""
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
        """
        Hợp nhất dữ liệu gốc từ Google Sheets với các thao tác Thêm / Sửa / Xóa cục bộ:
        1. Bỏ qua các nhân viên nằm trong deleted_ids
        2. Cập nhật các nhân viên nằm trong updated_records
        3. Ghép nối thêm các nhân viên mới trong added_records
        4. Đánh lại số thứ tự STT
        """
        deleted_ids = set(self._mutations.get("deleted_ids", []))
        updated_records = self._mutations.get("updated_records", {})
        added_records = self._mutations.get("added_records", [])

        merged: List[Dict[str, Any]] = []

        # Xử lý danh sách gốc
        for idx, item in enumerate(base_records):
            rec = dict(item)
            rec_id = self._get_record_id(rec, idx)
            rec["_id"] = rec_id

            # Nếu đã xóa -> bỏ qua
            if rec_id in deleted_ids:
                continue

            # Nếu có chỉnh sửa -> cập nhật giá trị mới
            if rec_id in updated_records:
                update_val = updated_records[rec_id]
                for k, v in update_val.items():
                    if k != "_id":
                        rec[k] = v

            merged.append(rec)

        # Xử lý các nhân viên được thêm mới
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

        # Đánh lại STT chuẩn từ 1 đến N
        for i, r in enumerate(merged, start=1):
            r["STT"] = str(i)

        return merged

    def get_data(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Lấy danh sách nhân viên đã chuẩn hóa kèm metadata, thống kê và các thay đổi Thêm/Sửa/Xóa."""
        now = datetime.now()
        is_cache_valid = (
            not force_refresh 
            and self._base_data is not None 
            and self._last_updated is not None 
            and (now - self._last_updated).total_seconds() < self.cache_ttl
        )

        if not is_cache_valid:
            df, success, error_msg = self._fetch_from_google_sheet()
            if success and not df.empty:
                self._cached_raw_df = df
                self._base_data = df.to_dict(orient="records")
                self._last_updated = now
                self._last_error = None
                self._data_source = "Google Sheets Trực tiếp"
                self._is_sample = False
            else:
                if self._base_data is None:
                    sample_df, source_desc = self._load_fallback_sample()
                    self._cached_raw_df = sample_df
                    self._base_data = sample_df.to_dict(orient="records")
                    self._last_updated = now
                    self._last_error = error_msg
                    self._data_source = source_desc
                    self._is_sample = True
                else:
                    self._last_error = error_msg

        # Luôn hợp nhất các thao tác Thêm / Sửa / Xóa vào base data
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

    # ==========================
    # CÁC THAO TÁC THÊM / SỬA / XÓA (CRUD)
    # ==========================

    def add_employee(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Thêm mới một nhân viên vào hệ thống."""
        # Chuẩn hóa dữ liệu theo 30 cột
        new_emp: Dict[str, str] = {col: str(data.get(col, "")).strip() for col in EXPECTED_COLUMNS}
        
        # Nếu chưa có Mã NV, tự động tạo mã NV
        if not new_emp["Mã NV"]:
            new_emp["Mã NV"] = f"NV{datetime.now().strftime('%y%m%d%H%M%S')}"

        rec_id = new_emp["Mã NV"]
        new_emp["_id"] = rec_id

        # Lưu vào danh sách added_records
        added_list = self._mutations.get("added_records", [])
        added_list.append(new_emp)
        self._mutations["added_records"] = added_list
        self._save_mutations()

        # Làm mới cache hiển thị
        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)

        return new_emp

    def update_employee(self, emp_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Chỉnh sửa thông tin nhân viên theo _id hoặc Mã NV."""
        emp_id = str(emp_id).strip()
        if not emp_id:
            return None

        # Kiểm tra xem có trong added_records không
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
            # Lưu vào updated_records
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

        # Trả về bản ghi mới nhất
        for r in (self._cached_data or []):
            if str(r.get("_id")) == emp_id or str(r.get("Mã NV")) == emp_id:
                return r

        return data

    def delete_employee(self, emp_id: str) -> bool:
        """Xóa một nhân viên theo _id hoặc Mã NV."""
        emp_id = str(emp_id).strip()
        if not emp_id:
            return False

        # Nếu nằm trong added_records -> xóa trực tiếp khỏi added_records
        added_records = self._mutations.get("added_records", [])
        new_added = [r for r in added_records if str(r.get("_id") or r.get("Mã NV")) != emp_id]
        was_added = len(new_added) < len(added_records)
        self._mutations["added_records"] = new_added

        # Thêm vào deleted_ids nếu là bản ghi từ sheet gốc
        deleted_ids = set(self._mutations.get("deleted_ids", []))
        deleted_ids.add(emp_id)
        self._mutations["deleted_ids"] = list(deleted_ids)

        # Xóa khỏi updated_records nếu có
        updated_records = self._mutations.get("updated_records", {})
        if emp_id in updated_records:
            del updated_records[emp_id]
            self._mutations["updated_records"] = updated_records

        self._save_mutations()

        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)

        return True

    def reset_mutations(self) -> bool:
        """Khôi phục lại dữ liệu gốc ban đầu từ Google Sheets (xóa toàn bộ thêm/sửa/xóa cục bộ)."""
        self._mutations = {"deleted_ids": [], "updated_records": {}, "added_records": []}
        self._save_mutations()
        if self._base_data is not None:
            self._cached_data = self._merge_mutations(self._base_data)
        return True

    def extract_filter_options(self, records: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Lấy danh sách các giá trị duy nhất cho từng dropdown bộ lọc."""
        keys = ["Vùng", "Đối tác", "Block", "Chức danh", "Tình trạng Hợp đồng", "Tình trạng Tài khoản", "Loại HĐLĐ"]
        options = {k: set() for k in keys}
        for r in records:
            for k in keys:
                val = str(r.get(k, "")).strip()
                if val:
                    options[k].add(val)
        return {k: sorted(list(v)) for k, v in options.items()}

    def calculate_stats(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Tính toán các chỉ số thống kê."""
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

# Khởi tạo singleton instance
sheets_service = SheetsService()
