# main.py
import csv
import io
import os
import tempfile
from datetime import datetime
from pathlib import Path

import numpy as np
import tensorflow as tf
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

from save_to_gsheets import append_values_to_gsheet
from utils import create_unique_filename, upload_blob

app = FastAPI(title="VitaVision API")

# ── Load the trained model ──────────────────────────────────────────────
MODEL_PATH = Path("model/food-10-version.keras")
model = tf.keras.models.load_model(str(MODEL_PATH))

CLASS_NAMES = [
    "apple",
    "banana",
    "beef",
    "blueberries",
    "carrots",
    "chicken_wings",
    "egg",
    "honey",
    "mushrooms",
    "strawberries",
]
IMG_SIZE = 380  # model input size

# ── Load nutrition data ─────────────────────────────────────────────────
NUTRITION_CSV = Path("data_exploration/target_ten_whole_food_nutrition_info.csv")
NUTRITION_DATA: dict[str, dict] = {}


def calculate_health_score(protein: float, fat: float, carbohydrate: float, calories: float) -> float:
    """Health Score (0–10) based on nutritional rules."""
    score = 5.0

    # 1. Protein (max +2)
    if protein >= 25:
        score += 2
    elif protein >= 15:
        score += 1
    elif protein >= 5:
        score += 0.5

    # 2. Fat (max +2)
    if fat <= 5:
        score += 2
    elif fat <= 15:
        score += 1
    elif fat > 30:
        score -= 2

    # 3. Carbohydrate (max +1)
    if carbohydrate <= 50:
        score += 1
    elif carbohydrate > 70:
        score -= 1

    # 4. Calories (max +1)
    if calories <= 200:
        score += 1
    elif calories > 400:
        score -= 1

    return round(max(0, min(score, 10)), 1)


if NUTRITION_CSV.exists():
    with NUTRITION_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            food_name = row.get("food_name")
            if not food_name:
                continue
            food_name = food_name.strip().lower()
            protein = float(row["protein"])
            fat = float(row["fat"])
            carbohydrate = float(row["carbohydrate"])
            # Use "Energy (Atwater Specific Factors)" as calories if available
            calories_raw = row.get("Energy (Atwater Specific Factors)", "").strip()
            if calories_raw:
                calories = round(float(calories_raw))
            else:
                # Fallback: calculate from macros
                calories = round((protein * 4) + (carbohydrate * 4) + (fat * 9))
            health_score = calculate_health_score(protein, fat, carbohydrate, calories)
            NUTRITION_DATA[food_name] = {
                "protein": protein,
                "fat": fat,
                "carbohydrate": carbohydrate,
                "calories": calories,
                "health_score": health_score,
            }
    print(f"✅ Loaded nutrition data for {len(NUTRITION_DATA)} foods")
else:
    print(f"⚠️  Nutrition CSV not found at {NUTRITION_CSV}")


# ── Serve the frontend ──────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    return HTMLResponse(content=Path("index.html").read_text(encoding="utf-8"))


# ── Static assets (CSS, JS, images) ─────────────────────────────────────
app.mount("/static", StaticFiles(directory="."), name="static")


# ── Prediction endpoint ─────────────────────────────────────────────────
@app.post("/predict")
async def predict_food(file: UploadFile = File(...)):
    """Receive an image, run the model, and return top-3 predictions."""
    contents = await file.read()

    # Save uploaded bytes to a temporary file so we can use
    # tf.keras.preprocessing.image.load_img (which expects a file path)
    suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # ── Load image using TensorFlow's load_img ──
        image = tf.keras.preprocessing.image.load_img(
            tmp_path,
            target_size=(IMG_SIZE, IMG_SIZE),
        )
        input_arr = tf.keras.preprocessing.image.img_to_array(image)
        # Remove the hard-coded division by 255 — load_img already returns
        # pixels in [0, 255] range and the model expects raw uint8-like values.
        input_arr = tf.expand_dims(input_arr, axis=0)

        # ── Predict ──
        predictions = model.predict(input_arr, verbose=0)

        predicted_index = int(np.argmax(predictions))
        predicted_food = CLASS_NAMES[predicted_index]
        confidence = float(predictions[0][predicted_index])

        # ── Top-3 predictions ──
        top_indices = np.argsort(predictions[0])[-3:][::-1]
        top_predictions = [{"label": CLASS_NAMES[int(i)], "confidence": float(predictions[0][i])} for i in top_indices]
    finally:
        # Clean up the temporary file
        os.unlink(tmp_path)

    # ── Get original image dimensions from raw bytes ──
    img_pil = Image.open(io.BytesIO(contents))
    width, height = img_pil.size

    return {
        "prediction": predicted_food,
        "confidence": confidence,
        "top_predictions": top_predictions,
        "nutrition": NUTRITION_DATA.get(predicted_food),
        "image_width": width,
        "image_height": height,
    }


# ── Confirmation / storage endpoint ─────────────────────────────────────
@app.post("/confirm")
async def confirm_prediction(
    file: UploadFile = File(...),
    label: str = Form(...),
    email: str = Form(""),
    country: str = Form(""),
    source: str = Form("web-app"),
):
    """Store the image + metadata after user confirms (or corrects) the prediction."""
    # 1. Generate unique ID & timestamp
    image_id = create_unique_filename()
    upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 2. Read image to get dimensions (using PIL)
    contents = await file.read()
    try:
        img_pil = Image.open(io.BytesIO(contents))
        width, height = img_pil.size
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "Could not decode image for storage."},
        )

    # 3. Upload image to Google Cloud Storage
    destination_blob_name = f"{image_id}.jpg"
    try:
        # Re-create a file-like object from the bytes
        file_bytes = io.BytesIO(contents)
        file_bytes.name = destination_blob_name
        upload_blob(
            file_bytes,
            destination_blob_name,
            content_type="image/jpeg",
        )
    except RuntimeError as error:
        return JSONResponse(
            status_code=500,
            content={"error": f"Image upload failed: {error}"},
        )

    # 4. Store metadata in Google Sheets
    metadata_row = [
        image_id,
        upload_time,
        str(height),
        str(width),
        email,
        country,
        label,
        source,
    ]
    try:
        append_values_to_gsheet([metadata_row])
    except (PermissionError, RuntimeError) as error:
        return JSONResponse(
            status_code=500,
            content={"error": f"Metadata storage failed: {error}"},
        )

    return {
        "status": "success",
        "image_id": image_id,
        "label": label,
        "message": f"Image stored as {image_id}.jpg with label '{label}'.",
    }


# ── Entry point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
