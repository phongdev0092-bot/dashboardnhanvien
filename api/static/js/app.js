/**
 * Employee Management Dashboard - JavaScript Application
 * Phong cách shadcn/ui, hiệu năng cao, hỗ trợ tìm kiếm tiếng Việt không dấu
 * Đầy đủ chức năng THÊM / SỬA / XÓA (CRUD)
 */

// Danh sách chuẩn 30 cột
const ALL_COLUMNS = [
  "STT", "Vùng", "Đối tác", "Block", "Họ Tên NV", "Mã NV",
  "Inside Account", "Password", "CMND", "Địa chỉ", "Email",
  "Số điện thoại", "Tình trạng Tài khoản", "Tình trạng Hợp đồng",
  "Chức danh", "Điều hành", "Loại HĐLĐ", "Phân công", "Tính lương",
  "Tọa độ", "Vị trí phụ trách", "Hình ảnh", "Hỗ trợ",
  "Mã NV Đội trưởng", "Họ tên Đội trưởng", "Số điện thoại FRT",
  "Ngày Vô Công Ty", "Ngày làm Việc Cuối", "Mobisale", "Roles"
];

// 12 cột hiển thị mặc định
const DEFAULT_VISIBLE_COLUMNS = [
  "STT", "Họ Tên NV", "Mã NV", "Vùng", "Đối tác", "Block",
  "Chức danh", "Số điện thoại", "Email", "Tình trạng Tài khoản",
  "Tình trạng Hợp đồng", "Ngày Vô Công Ty"
];

// App State
const state = {
  rawData: [],
  filteredData: [],
  totalRaw: 0,
  currentPage: 1,
  pageSize: 25,
  sortCol: "STT",
  sortAsc: true,
  searchQuery: "",
  filters: {
    "Vùng": "",
    "Đối tác": "",
    "Block": "",
    "Chức danh": "",
    "Tình trạng Hợp đồng": "",
    "Tình trạng Tài khoản": "",
    "Loại HĐLĐ": ""
  },
  visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
  showSensitive: false,
  selectedEmployee: null,
  isPasswordRevealed: false,
  isCmndRevealed: false,
  isLoading: false,
  lastUpdated: "",
  source: "",
  formMode: "create", // "create" hoặc "edit"
  deletingEmployeeId: null
};

// Chuẩn hóa tiếng Việt không dấu để tìm kiếm thông minh
function removeVietnameseTones(str) {
  if (!str) return "";
  str = String(str);
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toLowerCase().trim();
}

// Khởi tạo Theme Sáng/Tối
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  updateThemeIcons();
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcons();
}

function updateThemeIcons() {
  const isDark = document.documentElement.classList.contains("dark");
  const sunIcon = document.getElementById("theme-icon-sun");
  const moonIcon = document.getElementById("theme-icon-moon");
  if (sunIcon && moonIcon) {
    if (isDark) {
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
    } else {
      sunIcon.classList.add("hidden");
      moonIcon.classList.remove("hidden");
    }
  }
}

// Quản lý cột hiển thị qua LocalStorage
function initVisibleColumns() {
  const savedCols = localStorage.getItem("visible_columns");
  if (savedCols) {
    try {
      const parsed = JSON.parse(savedCols);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.visibleColumns = parsed;
      }
    } catch (e) {
      console.warn("Lỗi đọc cấu hình cột từ localStorage:", e);
    }
  }
}

function saveVisibleColumns() {
  localStorage.setItem("visible_columns", JSON.stringify(state.visibleColumns));
}

// Tải dữ liệu ban đầu từ API
async function loadData(forceRefresh = false) {
  setLoading(true);
  try {
    const url = forceRefresh ? "/api/refresh" : "/api/data";
    const method = forceRefresh ? "POST" : "GET";
    const response = await fetch(url, { method });
    const result = await response.json();

    if (!result.success && !result.data) {
      showToast("Lỗi tải dữ liệu: " + (result.error || "Không xác định"), "error");
      return;
    }

    state.rawData = result.data || [];
    state.totalRaw = result.total || 0;
    state.showSensitive = !!result.show_sensitive;
    state.lastUpdated = result.last_updated || "";
    state.source = result.source || "";

    const lastUpdatedEl = document.getElementById("last-updated-text");
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = state.lastUpdated ? `Cập nhật: ${state.lastUpdated}` : "";
    }

    const dataSourceBadge = document.getElementById("data-source-badge");
    if (dataSourceBadge) {
      dataSourceBadge.textContent = state.source;
    }

    renderErrorBanner(result.error, result.is_sample);
    populateFilterDropdowns(result.filter_options);
    applyFilters();

    if (forceRefresh) {
      showToast("Đã làm mới dữ liệu thành công!", "success");
    }
  } catch (err) {
    console.error("Lỗi khi gọi API dữ liệu:", err);
    showToast("Không thể kết nối đến máy chủ API.", "error");
  } finally {
    setLoading(false);
  }
}

// Hiển thị cảnh báo lỗi quyền truy cập Google Sheets
function renderErrorBanner(errorMsg, isSample) {
  const bannerContainer = document.getElementById("alert-banner-container");
  if (!bannerContainer) return;

  if (errorMsg) {
    bannerContainer.innerHTML = `
      <div class="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></i>
          <div class="text-sm">
            <p class="font-medium">Thông báo kết nối Google Sheets:</p>
            <p class="text-xs opacity-90 mt-1">${escapeHtml(errorMsg)}</p>
            ${isSample ? '<p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">Đang hiển thị dữ liệu mẫu dự phòng để bạn xem trước giao diện.</p>' : ''}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="https://docs.google.com/spreadsheets/d/17QLc9SlfpPPrR-d1R2BkBxA7DmCI5ZCuhmQffP5F6pY/edit" target="_blank" rel="noopener noreferrer" 
             class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Mở Google Sheet
          </a>
          <button onclick="loadData(true)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Thử lại
          </button>
        </div>
      </div>
    `;
    lucide.createIcons();
  } else {
    bannerContainer.innerHTML = "";
  }
}

// Điền các giá trị vào dropdown bộ lọc
function populateFilterDropdowns(options) {
  if (!options) return;
  const filterKeys = ["Vùng", "Đối tác", "Block", "Chức danh", "Tình trạng Hợp đồng", "Tình trạng Tài khoản", "Loại HĐLĐ"];

  filterKeys.forEach(key => {
    const selectEl = document.getElementById(`filter-${toCssId(key)}`);
    if (!selectEl) return;

    const currentVal = state.filters[key] || "";
    const list = options[key] || [];

    let html = `<option value="">Tất cả ${key}</option>`;
    list.forEach(val => {
      const selected = val === currentVal ? "selected" : "";
      html += `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(val)}</option>`;
    });

    selectEl.innerHTML = html;
  });
}

function toCssId(str) {
  return removeVietnameseTones(str).replace(/\s+/g, "-");
}

// Áp dụng bộ lọc và tìm kiếm tổng hợp
function applyFilters() {
  const queryNormalized = removeVietnameseTones(state.searchQuery);
  const activeFilters = state.filters;

  state.filteredData = state.rawData.filter(row => {
    // 1. Kiểm tra Dropdowns
    for (const [key, filterVal] of Object.entries(activeFilters)) {
      if (filterVal && String(row[key] || "").trim() !== filterVal) {
        return false;
      }
    }

    // 2. Kiểm tra ô tìm kiếm
    if (queryNormalized) {
      const searchFields = [
        row["Họ Tên NV"],
        row["Mã NV"],
        row["Email"],
        row["Số điện thoại"],
        row["Inside Account"]
      ];

      const matched = searchFields.some(field => {
        if (!field) return false;
        return removeVietnameseTones(field).includes(queryNormalized);
      });

      if (!matched) return false;
    }

    return true;
  });

  sortData();
  updateStatCards();
  state.currentPage = 1;
  renderTable();
  renderPagination();
}

// Sắp xếp dữ liệu
function sortData() {
  const col = state.sortCol;
  const asc = state.sortAsc;

  state.filteredData.sort((a, b) => {
    let valA = a[col] || "";
    let valB = b[col] || "";

    if (col === "STT") {
      const numA = parseInt(valA, 10) || 0;
      const numB = parseInt(valB, 10) || 0;
      return asc ? numA - numB : numB - numA;
    }

    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    return asc ? valA.localeCompare(valB, "vi") : valB.localeCompare(valA, "vi");
  });
}

function handleSort(col) {
  if (state.sortCol === col) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortCol = col;
    state.sortAsc = true;
  }
  sortData();
  renderTable();
}

// Cập nhật Thẻ Thống kê (Stat Cards)
function updateStatCards() {
  const totalRaw = state.totalRaw;
  const filtered = state.filteredData;
  const isFiltered = filtered.length !== totalRaw;

  const heroStatEl = document.getElementById("stat-total");
  const heroSubEl = document.getElementById("stat-total-sub");
  if (heroStatEl) {
    heroStatEl.textContent = isFiltered ? `${filtered.length.toLocaleString()} / ${totalRaw.toLocaleString()}` : totalRaw.toLocaleString();
  }
  if (heroSubEl) {
    heroSubEl.textContent = isFiltered ? `Đang lọc: ${filtered.length} nhân viên` : "Toàn bộ nhân sự trong hệ thống";
  }

  let workingCount = 0;
  let resignedCount = 0;
  let activeAccountsCount = 0;
  const regions = new Set();

  filtered.forEach(r => {
    const end = String(r["Ngày làm Việc Cuối"] || "").trim();
    const accStatus = String(r["Tình trạng Tài khoản"] || "").toLowerCase();
    const region = String(r["Vùng"] || "").trim();

    if (region) regions.add(region);
    if (end) resignedCount++;
    else workingCount++;

    if (accStatus.includes("hoạt động") || accStatus.includes("active")) {
      activeAccountsCount++;
    }
  });

  const statWorking = document.getElementById("stat-working");
  if (statWorking) statWorking.textContent = workingCount.toLocaleString();

  const statResigned = document.getElementById("stat-resigned");
  if (statResigned) statResigned.textContent = resignedCount.toLocaleString();

  const statActiveAcc = document.getElementById("stat-active-acc");
  if (statActiveAcc) statActiveAcc.textContent = activeAccountsCount.toLocaleString();

  const statRegions = document.getElementById("stat-regions");
  if (statRegions) statRegions.textContent = regions.size.toLocaleString();
}

// Render Table Header & Body
function renderTable() {
  const thead = document.getElementById("employee-table-head");
  const tbody = document.getElementById("employee-table-body");
  const emptyState = document.getElementById("empty-state");
  const tableContainer = document.getElementById("table-container");

  if (!thead || !tbody) return;

  if (state.filteredData.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    if (tableContainer) tableContainer.classList.add("overflow-hidden");
    return;
  } else {
    if (emptyState) emptyState.classList.add("hidden");
    if (tableContainer) tableContainer.classList.remove("overflow-hidden");
  }

  // Render Thead
  let theadHtml = "<tr class=\"border-b border-border bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider\">";
  state.visibleColumns.forEach(col => {
    const isSorted = state.sortCol === col;
    const sortIcon = isSorted 
      ? (state.sortAsc ? "chevron-up" : "chevron-down") 
      : "chevrons-up-down";
    
    let stickyClass = "";
    if (col === "STT") stickyClass = "sticky-col-stt";
    else if (col === "Họ Tên NV") stickyClass = "sticky-col-name";

    theadHtml += `
      <th scope="col" class="py-3 px-3.5 text-left select-none cursor-pointer hover:text-foreground transition ${stickyClass}" onclick="handleSort('${escapeHtml(col)}')">
        <div class="flex items-center gap-1.5 whitespace-nowrap">
          <span>${escapeHtml(col)}</span>
          <i data-lucide="${sortIcon}" class="w-3.5 h-3.5 ${isSorted ? 'text-primary' : 'opacity-40'}"></i>
        </div>
      </th>
    `;
  });
  // Cột thao tác rộng hơn để chứa các nút Xem, Sửa, Xóa
  theadHtml += "<th scope=\"col\" class=\"py-3 px-3.5 text-center text-xs min-w-[140px]\">Thao tác</th></tr>";
  thead.innerHTML = theadHtml;

  // Phân trang
  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = startIdx + state.pageSize;
  const pageRows = state.filteredData.slice(startIdx, endIdx);

  // Render Tbody
  let tbodyHtml = "";
  pageRows.forEach((row, rowIdx) => {
    const isEven = rowIdx % 2 === 1;
    const actualIdx = startIdx + rowIdx;
    const rowId = row["_id"] || row["Mã NV"] || actualIdx;

    tbodyHtml += `<tr class="border-b border-border hover:bg-muted/50 cursor-pointer transition ${isEven ? 'bg-muted/15' : 'bg-card'}" onclick="openDetailModal(${actualIdx})">`;

    state.visibleColumns.forEach(col => {
      let stickyClass = "";
      if (col === "STT") stickyClass = "sticky-col-stt";
      else if (col === "Họ Tên NV") stickyClass = "sticky-col-name";

      const val = row[col] || "";
      const cellContent = formatCellContent(col, val, row);

      tbodyHtml += `
        <td class="py-3 px-3.5 text-sm whitespace-nowrap text-foreground ${stickyClass}">
          ${cellContent}
        </td>
      `;
    });

    // Cột Thao tác: Nút XEM, SỬA, XÓA
    tbodyHtml += `
      <td class="py-2.5 px-3.5 text-center whitespace-nowrap" onclick="event.stopPropagation()">
        <div class="inline-flex items-center gap-1">
          <!-- Nút Xem chi tiết -->
          <button onclick="openDetailModal(${actualIdx})" title="Xem chi tiết"
                  class="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
          <!-- Nút Sửa -->
          <button onclick="openEditModal(${actualIdx})" title="Chỉnh sửa thông tin"
                  class="p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <!-- Nút Xóa -->
          <button onclick="openDeleteModal(${actualIdx})" title="Xóa nhân viên"
                  class="p-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tbodyHtml += "</tr>";
  });

  tbody.innerHTML = tbodyHtml;
  lucide.createIcons();
}

// Định dạng hiển thị ô dữ liệu
function formatCellContent(col, val, row) {
  if (!val && val !== 0) return "<span class=\"text-muted-foreground/40 italic\">—</span>";
  val = String(val).trim();

  if (col === "Họ Tên NV") {
    const avatarUrl = row["Hình ảnh"] || "";
    const initials = getInitials(val);
    return `
      <div class="flex items-center gap-2.5">
        ${renderAvatar(avatarUrl, initials, 32)}
        <div>
          <div class="font-medium text-foreground">${escapeHtml(val)}</div>
          <div class="text-xs text-muted-foreground font-mono">${escapeHtml(row["Mã NV"] || "")}</div>
        </div>
      </div>
    `;
  }

  if (col === "Hình ảnh") {
    const initials = getInitials(row["Họ Tên NV"] || "NV");
    return renderAvatar(val, initials, 32);
  }

  if (col === "Tình trạng Tài khoản") return renderStatusBadge(val, "account");
  if (col === "Tình trạng Hợp đồng") return renderStatusBadge(val, "contract");

  if (col === "Số điện thoại" || col === "Số điện thoại FRT") {
    return `
      <a href="tel:${escapeHtml(val)}" class="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs" onclick="event.stopPropagation()">
        <i data-lucide="phone" class="w-3 h-3 text-muted-foreground"></i>
        ${escapeHtml(val)}
      </a>
    `;
  }

  if (col === "Email") {
    return `
      <a href="mailto:${escapeHtml(val)}" class="inline-flex items-center gap-1 text-primary hover:underline text-xs" onclick="event.stopPropagation()">
        <i data-lucide="mail" class="w-3 h-3 text-muted-foreground"></i>
        ${escapeHtml(val)}
      </a>
    `;
  }

  if (col === "Tọa độ") {
    const coords = val.replace(/\s+/g, "");
    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(coords)) {
      return `
        <a href="https://www.google.com/maps?q=${encodeURIComponent(coords)}" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline" onclick="event.stopPropagation()">
          <i data-lucide="map-pin" class="w-3 h-3 text-rose-500"></i>
          <span>${escapeHtml(val)}</span>
        </a>
      `;
    }
  }

  if (col === "CMND") return maskCmnd(val);
  if (col === "Password") return "<span class=\"font-mono tracking-widest text-muted-foreground\">••••••••</span>";
  if (col === "STT") return `<span class="font-mono text-xs text-muted-foreground">${escapeHtml(val)}</span>`;

  return escapeHtml(val);
}

function renderStatusBadge(status, type) {
  const lower = status.toLowerCase();
  let colorClasses = "bg-muted text-muted-foreground border-border";

  if (type === "account") {
    if (lower.includes("hoạt động") || lower.includes("active")) {
      colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    } else if (lower.includes("khóa") || lower.includes("inactive") || lower.includes("block")) {
      colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    }
  } else if (type === "contract") {
    if (lower.includes("còn hiệu lực") || lower.includes("hiệu lực") || lower.includes("chính thức")) {
      colorClasses = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    } else if (lower.includes("hết hạn") || lower.includes("chấm dứt") || lower.includes("nghỉ việc")) {
      colorClasses = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    } else if (lower.includes("thử việc") || lower.includes("chờ gia hạn") || lower.includes("tạm hoãn")) {
      colorClasses = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    }
  }

  return `
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses}">
      ${escapeHtml(status)}
    </span>
  `;
}

function renderAvatar(url, initials, size = 32) {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return `
      <img src="${escapeHtml(url)}" alt="avatar" class="w-${size/4} h-${size/4} rounded-full object-cover border border-border shrink-0" 
           onerror="this.onerror=null; this.parentElement.innerHTML='${renderInitialsAvatar(initials, size)}';"/>
    `;
  }
  return renderInitialsAvatar(initials, size);
}

function renderInitialsAvatar(initials, size = 32) {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
  ];
  const charCode = (initials.charCodeAt(0) || 0) % colors.length;
  const colorClass = colors[charCode];

  return `
    <div class="w-${size/4} h-${size/4} rounded-full flex items-center justify-center font-semibold text-xs border border-border shrink-0 ${colorClass}">
      ${escapeHtml(initials)}
    </div>
  `;
}

function getInitials(name) {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function maskCmnd(cmnd) {
  if (!cmnd) return "—";
  cmnd = String(cmnd).trim();
  if (cmnd.length <= 3) return cmnd;
  const last3 = cmnd.slice(-3);
  return `••••••••${last3}`;
}

// Phân trang
function renderPagination() {
  const container = document.getElementById("pagination-container");
  const infoEl = document.getElementById("pagination-info");
  if (!container || !infoEl) return;

  const total = state.filteredData.length;
  if (total === 0) {
    infoEl.textContent = "Không tìm thấy nhân viên nào";
    container.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(total / state.pageSize);
  const start = (state.currentPage - 1) * state.pageSize + 1;
  const end = Math.min(state.currentPage * state.pageSize, total);

  infoEl.textContent = `Hiển thị ${start}–${end} trong tổng số ${total.toLocaleString()} nhân viên`;

  let html = "";
  html += `
    <button onclick="goToPage(1)" ${state.currentPage === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-muted"'} 
            class="p-1.5 rounded border border-border text-xs flex items-center justify-center transition">
      <i data-lucide="chevrons-left" class="w-4 h-4"></i>
    </button>
    <button onclick="goToPage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-muted"'} 
            class="p-1.5 rounded border border-border text-xs flex items-center justify-center transition">
      <i data-lucide="chevron-left" class="w-4 h-4"></i>
    </button>
  `;

  const maxButtons = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const isActive = p === state.currentPage;
    html += `
      <button onclick="goToPage(${p})" 
              class="px-2.5 py-1 rounded text-xs font-medium border transition ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted text-foreground'}">
        ${p}
      </button>
    `;
  }

  html += `
    <button onclick="goToPage(${state.currentPage + 1})" ${state.currentPage === totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-muted"'} 
            class="p-1.5 rounded border border-border text-xs flex items-center justify-center transition">
      <i data-lucide="chevron-right" class="w-4 h-4"></i>
    </button>
    <button onclick="goToPage(${totalPages})" ${state.currentPage === totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-muted"'} 
            class="p-1.5 rounded border border-border text-xs flex items-center justify-center transition">
      <i data-lucide="chevrons-right" class="w-4 h-4"></i>
    </button>
  `;

  container.innerHTML = html;
  lucide.createIcons();
}

function goToPage(page) {
  const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
  if (page < 1 || page > totalPages) return;
  state.currentPage = page;
  renderTable();
  renderPagination();
  const tableWrapper = document.getElementById("table-container");
  if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function handlePageSizeChange(newSize) {
  state.pageSize = parseInt(newSize, 10);
  state.currentPage = 1;
  renderTable();
  renderPagination();
}

// ==========================================
// 1. DIALOG CHI TIẾT NHÂN VIÊN
// ==========================================
function openDetailModal(rowIndex) {
  const emp = state.filteredData[rowIndex];
  if (!emp) return;

  state.selectedEmployee = emp;
  state.isPasswordRevealed = false;
  state.isCmndRevealed = false;

  const modal = document.getElementById("employee-detail-modal");
  const modalContent = document.getElementById("modal-detail-body");
  if (!modal || !modalContent) return;

  modalContent.innerHTML = generateDetailModalHtml(emp, rowIndex);
  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  lucide.createIcons();
}

function closeDetailModal() {
  const modal = document.getElementById("employee-detail-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
}

function generateDetailModalHtml(emp, rowIndex) {
  const avatarUrl = emp["Hình ảnh"] || "";
  const initials = getInitials(emp["Họ Tên NV"]);

  const rawCmnd = emp["CMND"] || "";
  const displayCmnd = state.isCmndRevealed ? (rawCmnd || "—") : maskCmnd(rawCmnd);

  const rawPassword = emp["Password"] || "";
  let displayPassword = "••••••••";
  if (state.isPasswordRevealed && state.showSensitive) {
    displayPassword = rawPassword || "—";
  } else if (!state.showSensitive) {
    displayPassword = "•••••••• (Đã ẩn bởi quản trị viên)";
  }

  const coords = (emp["Tọa độ"] || "").replace(/\s+/g, "");
  let mapLinkHtml = `<span class="text-muted-foreground">—</span>`;
  if (coords) {
    mapLinkHtml = `
      <a href="https://www.google.com/maps?q=${encodeURIComponent(coords)}" target="_blank" rel="noopener noreferrer" 
         class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline">
        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500"></i> ${escapeHtml(emp["Tọa độ"])} (Mở Google Maps)
      </a>
    `;
  }

  return `
    <div class="flex items-start justify-between border-b border-border pb-4">
      <div class="flex items-center gap-4">
        ${renderAvatar(avatarUrl, initials, 56)}
        <div>
          <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
            ${escapeHtml(emp["Họ Tên NV"] || "Nhân viên")}
            ${renderStatusBadge(emp["Tình trạng Tài khoản"] || "—", "account")}
          </h2>
          <p class="text-sm text-muted-foreground">
            Mã NV: <span class="font-mono font-medium text-foreground">${escapeHtml(emp["Mã NV"] || "—")}</span> • 
            Chức danh: <span class="font-medium text-foreground">${escapeHtml(emp["Chức danh"] || "—")}</span> •
            Vùng: <span class="font-medium text-foreground">${escapeHtml(emp["Vùng"] || "—")}</span>
          </p>
        </div>
      </div>
      <button onclick="closeDetailModal()" class="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
      <!-- 1. Thông tin cá nhân -->
      <div class="rounded-lg border border-border p-4 bg-card shadow-sm space-y-3">
        <div class="flex items-center gap-2 border-b border-border pb-2 text-primary font-semibold text-sm">
          <i data-lucide="user" class="w-4 h-4"></i> 1. Thông tin cá nhân
        </div>
        <div class="text-xs space-y-2">
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Họ và tên:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Họ Tên NV"] || "—")}</span></div>
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">CMND / CCCD:</span> 
            <div class="flex items-center gap-1.5">
              <span id="detail-cmnd-val" class="font-mono font-medium text-foreground">${escapeHtml(displayCmnd)}</span>
              <button onclick="toggleRevealCmnd()" title="Bật/Tắt xem CMND" class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition">
                <i data-lucide="${state.isCmndRevealed ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Số điện thoại:</span> <a href="tel:${escapeHtml(emp["Số điện thoại"])}" class="text-primary hover:underline font-mono">${escapeHtml(emp["Số điện thoại"] || "—")}</a></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Email:</span> <a href="mailto:${escapeHtml(emp["Email"])}" class="text-primary hover:underline">${escapeHtml(emp["Email"] || "—")}</a></div>
          <div class="flex justify-between items-start"><span class="text-muted-foreground shrink-0">Địa chỉ:</span> <span class="font-medium text-right text-foreground max-w-[220px]">${escapeHtml(emp["Địa chỉ"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Tọa độ:</span> <div>${mapLinkHtml}</div></div>
        </div>
      </div>

      <!-- 2. Công việc & Phân công -->
      <div class="rounded-lg border border-border p-4 bg-card shadow-sm space-y-3">
        <div class="flex items-center gap-2 border-b border-border pb-2 text-primary font-semibold text-sm">
          <i data-lucide="briefcase" class="w-4 h-4"></i> 2. Công việc & Phân công
        </div>
        <div class="text-xs space-y-2">
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Vùng:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Vùng"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Đối tác:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Đối tác"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Block:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Block"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Chức danh:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Chức danh"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Điều hành:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Điều hành"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Loại HĐLĐ:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Loại HĐLĐ"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Phân công:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Phân công"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Tính lương:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Tính lương"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Vị trí phụ trách:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Vị trí phụ trách"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Ngày vào công ty:</span> <span class="font-mono text-foreground">${escapeHtml(emp["Ngày Vô Công Ty"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Ngày làm việc cuối:</span> <span class="font-mono text-rose-600 dark:text-rose-400 font-medium">${escapeHtml(emp["Ngày làm Việc Cuối"] || "Đang làm việc")}</span></div>
        </div>
      </div>

      <!-- 3. Tài khoản & Phân quyền -->
      <div class="rounded-lg border border-border p-4 bg-card shadow-sm space-y-3">
        <div class="flex items-center gap-2 border-b border-border pb-2 text-primary font-semibold text-sm">
          <i data-lucide="shield-check" class="w-4 h-4"></i> 3. Tài khoản & Phân quyền
        </div>
        <div class="text-xs space-y-2">
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Inside Account:</span> <span class="font-mono font-medium text-foreground">${escapeHtml(emp["Inside Account"] || "—")}</span></div>
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">Mật khẩu (Password):</span>
            <div class="flex items-center gap-1.5">
              <span id="detail-password-val" class="font-mono font-medium text-foreground">${escapeHtml(displayPassword)}</span>
              ${state.showSensitive ? `
                <button onclick="toggleRevealPassword()" title="Bật/Tắt xem Mật khẩu" class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition">
                  <i data-lucide="${state.isPasswordRevealed ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
          </div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Tình trạng tài khoản:</span> ${renderStatusBadge(emp["Tình trạng Tài khoản"] || "—", "account")}</div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Tình trạng hợp đồng:</span> ${renderStatusBadge(emp["Tình trạng Hợp đồng"] || "—", "contract")}</div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Mobisale:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Mobisale"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Roles / Vai trò:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Roles"] || "—")}</span></div>
        </div>
      </div>

      <!-- 4. Đội trưởng & Hỗ trợ -->
      <div class="rounded-lg border border-border p-4 bg-card shadow-sm space-y-3">
        <div class="flex items-center gap-2 border-b border-border pb-2 text-primary font-semibold text-sm">
          <i data-lucide="users" class="w-4 h-4"></i> 4. Đội trưởng & Hỗ trợ
        </div>
        <div class="text-xs space-y-2">
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Hỗ trợ:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Hỗ trợ"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Họ tên Đội trưởng:</span> <span class="font-medium text-foreground">${escapeHtml(emp["Họ tên Đội trưởng"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Mã NV Đội trưởng:</span> <span class="font-mono text-foreground">${escapeHtml(emp["Mã NV Đội trưởng"] || "—")}</span></div>
          <div class="flex justify-between items-center"><span class="text-muted-foreground">Số điện thoại FRT:</span> <a href="tel:${escapeHtml(emp["Số điện thoại FRT"])}" class="text-primary hover:underline font-mono">${escapeHtml(emp["Số điện thoại FRT"] || "—")}</a></div>
        </div>
      </div>
    </div>

    <!-- Footer Modal kèm các nút Thao tác SỬA & XÓA trực tiếp -->
    <div class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
      <div class="flex items-center gap-2">
        <button onclick="closeDetailModal(); openEditModal(${rowIndex});" 
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted text-blue-600 dark:text-blue-400 transition shadow-sm">
          <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          <span>Chỉnh sửa thông tin</span>
        </button>
        <button onclick="closeDetailModal(); openDeleteModal(${rowIndex});" 
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition shadow-sm">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Xóa nhân viên</span>
        </button>
      </div>

      <button onclick="closeDetailModal()" class="px-4 py-2 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted text-foreground transition">
        Đóng
      </button>
    </div>
  `;
}

function toggleRevealPassword() {
  if (!state.showSensitive) return;
  state.isPasswordRevealed = !state.isPasswordRevealed;
  const raw = state.selectedEmployee ? (state.selectedEmployee["Password"] || "") : "";
  const el = document.getElementById("detail-password-val");
  if (el) el.textContent = state.isPasswordRevealed ? (raw || "—") : "••••••••";
}

function toggleRevealCmnd() {
  state.isCmndRevealed = !state.isCmndRevealed;
  const raw = state.selectedEmployee ? (state.selectedEmployee["CMND"] || "") : "";
  const el = document.getElementById("detail-cmnd-val");
  if (el) el.textContent = state.isCmndRevealed ? (raw || "—") : maskCmnd(raw);
}

// ==========================================
// 2. MODAL FORM: THÊM / SỬA NHÂN VIÊN
// ==========================================
function openCreateModal() {
  state.formMode = "create";
  const form = document.getElementById("employee-form");
  if (form) form.reset();

  const titleEl = document.getElementById("form-modal-title");
  const subtitleEl = document.getElementById("form-modal-subtitle");
  const submitTextEl = document.getElementById("form-submit-text");
  const idInput = document.getElementById("form-emp-id");

  if (titleEl) titleEl.textContent = "Thêm nhân viên mới";
  if (subtitleEl) subtitleEl.textContent = "Điền đầy đủ thông tin nhân viên theo các danh mục bên dưới";
  if (submitTextEl) submitTextEl.textContent = "Lưu nhân viên";
  if (idInput) idInput.value = "";

  const modal = document.getElementById("employee-form-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }
  lucide.createIcons();
}

function openEditModal(rowIndex) {
  state.formMode = "edit";
  const emp = state.filteredData[rowIndex];
  if (!emp) return;

  const form = document.getElementById("employee-form");
  if (!form) return;
  form.reset();

  const titleEl = document.getElementById("form-modal-title");
  const subtitleEl = document.getElementById("form-modal-subtitle");
  const submitTextEl = document.getElementById("form-submit-text");
  const idInput = document.getElementById("form-emp-id");

  if (titleEl) titleEl.textContent = `Chỉnh sửa: ${emp["Họ Tên NV"] || "Nhân viên"}`;
  if (subtitleEl) subtitleEl.textContent = `Cập nhật thông tin chi tiết cho mã NV: ${emp["Mã NV"] || "—"}`;
  if (submitTextEl) submitTextEl.textContent = "Lưu thay đổi";
  if (idInput) idInput.value = emp["_id"] || emp["Mã NV"] || "";

  // Điền dữ liệu vào các input form
  setFormValue("form-HoTenNV", emp["Họ Tên NV"]);
  setFormValue("form-MaNV", emp["Mã NV"]);
  setFormValue("form-CMND", emp["CMND"]);
  setFormValue("form-SoDienThoai", emp["Số điện thoại"]);
  setFormValue("form-Email", emp["Email"]);
  setFormValue("form-ToaDo", emp["Tọa độ"]);
  setFormValue("form-DiaChi", emp["Địa chỉ"]);
  setFormValue("form-HinhAnh", emp["Hình ảnh"]);

  setFormValue("form-Vung", emp["Vùng"]);
  setFormValue("form-DoiTac", emp["Đối tác"]);
  setFormValue("form-Block", emp["Block"]);
  setFormValue("form-ChucDanh", emp["Chức danh"]);
  setFormValue("form-DieuHanh", emp["Điều hành"]);
  setFormValue("form-LoaiHDLD", emp["Loại HĐLĐ"]);
  setFormValue("form-PhanCong", emp["Phân công"]);
  setFormValue("form-TinhLuong", emp["Tính lương"]);
  setFormValue("form-ViTriPhuTrach", emp["Vị trí phụ trách"]);
  setFormValue("form-NgayVoCongTy", emp["Ngày Vô Công Ty"]);
  setFormValue("form-NgayLamViecCuoi", emp["Ngày làm Việc Cuối"]);

  setFormValue("form-InsideAccount", emp["Inside Account"]);
  setFormValue("form-Password", emp["Password"]);
  setFormValue("form-TinhTrangTaiKhoan", emp["Tình trạng Tài khoản"] || "Hoạt động");
  setFormValue("form-TinhTrangHopDong", emp["Tình trạng Hợp đồng"] || "Còn hiệu lực");
  setFormValue("form-Mobisale", emp["Mobisale"] || "Có");
  setFormValue("form-Roles", emp["Roles"]);

  setFormValue("form-HoTro", emp["Hỗ trợ"]);
  setFormValue("form-MaNVDoiTruong", emp["Mã NV Đội trưởng"]);
  setFormValue("form-HoTenDoiTruong", emp["Họ tên Đội trưởng"]);
  setFormValue("form-SoDienThoaiFRT", emp["Số điện thoại FRT"]);

  const modal = document.getElementById("employee-form-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }
  lucide.createIcons();
}

function setFormValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function closeFormModal() {
  const modal = document.getElementById("employee-form-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
}

async function handleSaveEmployee(event) {
  event.preventDefault();
  const form = document.getElementById("employee-form");
  if (!form) return;

  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    if (key !== "_id") data[key] = value.trim();
  });

  const empId = document.getElementById("form-emp-id").value;
  const isCreate = state.formMode === "create";
  const url = isCreate ? "/api/employees" : `/api/employees/${encodeURIComponent(empId)}`;
  const method = isCreate ? "POST" : "PUT";

  const submitBtn = document.getElementById("form-submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!result.success) {
      showToast(result.error || "Thao tác thất bại", "error");
      return;
    }

    showToast(result.message || "Lưu nhân viên thành công!", "success");
    closeFormModal();
    // Tải lại dữ liệu ngay
    await loadData(false);
  } catch (err) {
    console.error("Lỗi khi lưu nhân viên:", err);
    showToast("Lỗi kết nối khi lưu nhân viên.", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ==========================================
// 3. MODAL ALERT: XÓA NHÂN VIÊN
// ==========================================
function openDeleteModal(rowIndex) {
  const emp = state.filteredData[rowIndex];
  if (!emp) return;

  state.deletingEmployeeId = emp["_id"] || emp["Mã NV"] || "";

  const nameEl = document.getElementById("delete-emp-name");
  const codeEl = document.getElementById("delete-emp-code");
  if (nameEl) nameEl.textContent = emp["Họ Tên NV"] || "Nhân viên này";
  if (codeEl) codeEl.textContent = emp["Mã NV"] || "—";

  const modal = document.getElementById("delete-confirm-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }
  lucide.createIcons();
}

function closeDeleteModal() {
  const modal = document.getElementById("delete-confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    state.deletingEmployeeId = null;
  }
}

async function executeDeleteEmployee() {
  const empId = state.deletingEmployeeId;
  if (!empId) return;

  const btn = document.getElementById("confirm-delete-btn");
  if (btn) btn.disabled = true;

  try {
    const response = await fetch(`/api/employees/${encodeURIComponent(empId)}`, {
      method: "DELETE"
    });

    const result = await response.json();
    if (!result.success) {
      showToast(result.error || "Xóa thất bại", "error");
      return;
    }

    showToast(result.message || "Đã xóa nhân viên thành công!", "success");
    closeDeleteModal();
    await loadData(false);
  } catch (err) {
    console.error("Lỗi khi xóa nhân viên:", err);
    showToast("Lỗi kết nối khi xóa nhân viên.", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// XUẤT CSV
function exportFilteredCsv() {
  if (state.filteredData.length === 0) {
    showToast("Không có dữ liệu để xuất CSV.", "warning");
    return;
  }

  const exportCols = ALL_COLUMNS.filter(col => col !== "Password");
  const csvRows = [];
  csvRows.push(exportCols.map(c => `"${c.replace(/"/g, '""')}"`).join(","));

  state.filteredData.forEach(row => {
    const rowValues = exportCols.map(col => {
      let val = row[col] || "";
      if (col === "CMND" && !state.showSensitive) {
        val = maskCmnd(val);
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(rowValues.join(","));
  });

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const filename = `danh_sach_nhan_vien_${timeStr}.csv`;

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Đã xuất ${state.filteredData.length} nhân viên ra file CSV.`, "success");
}

// DROPDOWN QUẢN LÝ CỘT HIỂN THỊ
function toggleColumnDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById("column-dropdown-menu");
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains("hidden");
  if (isHidden) {
    renderColumnCheckboxes();
    dropdown.classList.remove("hidden");
  } else {
    dropdown.classList.add("hidden");
  }
}

function renderColumnCheckboxes() {
  const container = document.getElementById("column-checkbox-list");
  if (!container) return;

  let html = "";
  ALL_COLUMNS.forEach(col => {
    if (col === "Password") return;

    const isChecked = state.visibleColumns.includes(col);
    const isLocked = col === "STT" || col === "Họ Tên NV";

    html += `
      <label class="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer select-none">
        <input type="checkbox" value="${escapeHtml(col)}" ${isChecked ? 'checked' : ''} ${isLocked ? 'disabled' : ''} 
               onchange="handleColumnToggle('${escapeHtml(col)}', this.checked)"
               class="rounded border-border text-primary focus:ring-ring w-3.5 h-3.5 ${isLocked ? 'opacity-50' : ''}">
        <span class="${isLocked ? 'font-semibold' : ''}">${escapeHtml(col)} ${isLocked ? '(Cố định)' : ''}</span>
      </label>
    `;
  });

  container.innerHTML = html;
}

function handleColumnToggle(col, isChecked) {
  if (isChecked) {
    if (!state.visibleColumns.includes(col)) state.visibleColumns.push(col);
  } else {
    state.visibleColumns = state.visibleColumns.filter(c => c !== col);
  }
  saveVisibleColumns();
  renderTable();
}

function resetDefaultColumns() {
  state.visibleColumns = [...DEFAULT_VISIBLE_COLUMNS];
  saveVisibleColumns();
  renderColumnCheckboxes();
  renderTable();
}

function clearAllFilters() {
  state.searchQuery = "";
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";

  Object.keys(state.filters).forEach(k => {
    state.filters[k] = "";
    const el = document.getElementById(`filter-${toCssId(k)}`);
    if (el) el.value = "";
  });

  applyFilters();
  showToast("Đã xóa tất cả bộ lọc.", "info");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  let bgClass = "bg-primary text-primary-foreground border-border";
  let iconName = "info";

  if (type === "success") {
    bgClass = "bg-emerald-600 text-white border-emerald-700";
    iconName = "check-circle";
  } else if (type === "error") {
    bgClass = "bg-rose-600 text-white border-rose-700";
    iconName = "alert-circle";
  } else if (type === "warning") {
    bgClass = "bg-amber-600 text-white border-amber-700";
    iconName = "alert-triangle";
  }

  toast.className = `flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-lg text-xs font-medium transition-all transform translate-y-2 opacity-0 duration-300 ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => toast.classList.remove("translate-y-2", "opacity-0"), 10);
  setTimeout(() => {
    toast.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  const refreshBtnIcon = document.getElementById("refresh-btn-icon");
  const loadingSkeleton = document.getElementById("loading-skeleton");
  const tableContainer = document.getElementById("table-container");

  if (refreshBtnIcon) {
    if (isLoading) refreshBtnIcon.classList.add("animate-spin");
    else refreshBtnIcon.classList.remove("animate-spin");
  }

  if (loadingSkeleton && tableContainer) {
    if (isLoading && state.rawData.length === 0) {
      loadingSkeleton.classList.remove("hidden");
      tableContainer.classList.add("hidden");
    } else {
      loadingSkeleton.classList.add("hidden");
      tableContainer.classList.remove("hidden");
    }
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// EVENT LISTENERS & INIT
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initVisibleColumns();

  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const searchInput = document.getElementById("search-input");
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value;
        applyFilters();
      }, 250);
    });
  }

  const filterKeys = ["Vùng", "Đối tác", "Block", "Chức danh", "Tình trạng Hợp đồng", "Tình trạng Tài khoản", "Loại HĐLĐ"];
  filterKeys.forEach(k => {
    const el = document.getElementById(`filter-${toCssId(k)}`);
    if (el) {
      el.addEventListener("change", (e) => {
        state.filters[k] = e.target.value;
        applyFilters();
      });
    }
  });

  document.addEventListener("click", (e) => {
    const colMenu = document.getElementById("column-dropdown-menu");
    const colBtn = document.getElementById("column-dropdown-btn");
    if (colMenu && !colMenu.classList.contains("hidden")) {
      if (!colMenu.contains(e.target) && (!colBtn || !colBtn.contains(e.target))) {
        colMenu.classList.add("hidden");
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailModal();
      closeFormModal();
      closeDeleteModal();
      const colMenu = document.getElementById("column-dropdown-menu");
      if (colMenu) colMenu.classList.add("hidden");
    }
  });

  loadData();
});
