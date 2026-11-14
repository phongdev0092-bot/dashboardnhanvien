import os
import sys

# Thêm thư mục gốc của dự án vào sys.path để import được main và services trên Vercel
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from main import app
