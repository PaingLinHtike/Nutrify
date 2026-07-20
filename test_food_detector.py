"""Test the food/not-food detector integration."""

import io
import requests
import numpy as np
from PIL import Image

BASE = "http://localhost:8000"

# ── Test 1: Food image (pizza) ──
print("=== TEST 1: Food image (pizza) ===")
with open("sample_food_images/pizza.jpg", "rb") as f:
    r = requests.post(f"{BASE}/predict", files={"file": f})
print(f"Status: {r.status_code}")
data = r.json()
print(f"is_food: {data.get('is_food')}")
if data.get("is_food"):
    print(f"food_detection_confidence: {data['food_detection_confidence']:.4f}")
    print(f"prediction: {data['prediction']}")
    print(f"confidence: {data['confidence']:.4f}")
    print(f"top_predictions: {[(t['label'], f'{t['confidence']:.4f}') for t in data['top_predictions']]}")
else:
    print(f"message: {data.get('message')}")
print()

# ── Test 2: Non-food (solid red) ──
print("=== TEST 2: Non-food (solid red) ===")
pixels = np.zeros((300, 300, 3), dtype=np.uint8)
pixels[:, :, 0] = 255  # Red
img = Image.fromarray(pixels)
buf = io.BytesIO()
img.save(buf, format="JPEG")
buf.seek(0)
r2 = requests.post(f"{BASE}/predict", files={"file": ("red.jpg", buf, "image/jpeg")})
print(f"Status: {r2.status_code}")
data2 = r2.json()
print(f"is_food: {data2.get('is_food')}")
if not data2.get("is_food"):
    print(f"food_detection_confidence: {data2['food_detection_confidence']:.4f}")
    print(f"message: {data2.get('message')}")
print()

# ── Test 3: Food image (sushi) ──
print("=== TEST 3: Food image (sushi) ===")
with open("sample_food_images/sushi.jpg", "rb") as f:
    r3 = requests.post(f"{BASE}/predict", files={"file": f})
print(f"Status: {r3.status_code}")
data3 = r3.json()
print(f"is_food: {data3.get('is_food')}")
if data3.get("is_food"):
    print(f"food_detection_confidence: {data3['food_detection_confidence']:.4f}")
    print(f"prediction: {data3['prediction']}")
    print(f"confidence: {data3['confidence']:.4f}")

print("\n✅ All tests completed!")
