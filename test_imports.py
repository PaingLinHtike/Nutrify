"""Quick import test for all VitaVision dependencies."""

import sys

try:
    import cv2

    print(f"✅ OpenCV: {cv2.__version__}")
except ImportError as e:
    print(f"❌ OpenCV: {e}")
    sys.exit(1)

try:
    import fastapi

    print(f"✅ FastAPI: {fastapi.__version__}")
except ImportError as e:
    print(f"❌ FastAPI: {e}")
    sys.exit(1)

try:
    import uvicorn

    print(f"✅ Uvicorn: {uvicorn.__version__}")
except ImportError as e:
    print(f"❌ Uvicorn: {e}")
    sys.exit(1)

try:
    import tensorflow as tf

    print(f"✅ TensorFlow: {tf.__version__}")
except ImportError as e:
    print(f"❌ TensorFlow: {e}")
    sys.exit(1)

try:
    import numpy as np

    print(f"✅ NumPy: {np.__version__}")
except ImportError as e:
    print(f"❌ NumPy: {e}")
    sys.exit(1)

try:
    from PIL import Image

    print(f"✅ Pillow: {Image.__version__}")
except ImportError as e:
    print(f"❌ Pillow: {e}")
    sys.exit(1)

try:
    from save_to_gsheets import append_values_to_gsheet
    from utils import upload_blob, create_unique_filename

    print(f"✅ Utility modules: OK")
except ImportError as e:
    print(f"❌ Utility modules: {e}")
    sys.exit(1)

print("\n🎉 All imports successful! Ready to run.")
