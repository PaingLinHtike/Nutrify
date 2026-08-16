# main.py
import csv
import io
import json
import logging
import os
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

import numpy as np
import onnxruntime as ort
import tensorflow as tf
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

from save_to_gsheets import append_values_to_gsheet
from utils import create_unique_filename, upload_blob
from config.database import insert_food_metadata

app = FastAPI(title="VitaVision API")
logger = logging.getLogger(__name__)


# ── Helper: load models with potential config issues ──────────────────
def load_keras_model(path: Path):
    """Load a .keras model, fixing common Keras version incompatibilities."""
    try:
        return tf.keras.models.load_model(str(path), compile=False)
    except Exception:
        pass  # fall through to the fix-up path

    # Fix: remove quantization_config from the saved config
    dst = os.path.join(tempfile.gettempdir(), f"_fixed_{path.name}")
    with zipfile.ZipFile(str(path), "r") as zin:
        config = json.loads(zin.read("config.json"))

        def _clean(obj):
            if isinstance(obj, dict):
                obj.pop("quantization_config", None)
                for v in obj.values():
                    _clean(v)
            elif isinstance(obj, list):
                for item in obj:
                    _clean(item)

        _clean(config)
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "config.json":
                    zout.writestr(item, json.dumps(config))
                else:
                    zout.writestr(item, zin.read(item.filename))

    model = tf.keras.models.load_model(dst, compile=False)
    os.unlink(dst)
    return model


# ── Load the food-10 classifier model ──────────────────────────────────
MODEL_PATH = Path("model/food-10-version.keras")
model = load_keras_model(MODEL_PATH)
print(f"✅ Loaded food-10 classifier from {MODEL_PATH}")

# ── Load the food / not-food detector model ────────────────────────────
FOOD_DETECTOR_PATH = Path("model/food_or_not_food_detector_v2.keras")
food_detector = load_keras_model(FOOD_DETECTOR_PATH)
FOOD_DETECTOR_SIZE = 224  # input size for the food detector
FOOD_DETECTOR_THRESHOLD = 0.5  # confidence threshold for "food"
print(f"✅ Loaded food/not-food detector from {FOOD_DETECTOR_PATH}")

# The browser camera uses the ONNX export of this .pt checkpoint. ONNX Runtime
# keeps continuous frame inference lightweight and uses the exact trained weights.
REALTIME_MODEL_SOURCE_PATH = Path("model/realtime_food_recognition.pt")
REALTIME_MODEL_PATH = Path("model/realtime_food_recognition.onnx")
realtime_session = None
if REALTIME_MODEL_SOURCE_PATH.exists() and REALTIME_MODEL_PATH.exists():
    available_providers = ort.get_available_providers()
    providers = [provider for provider in ("CUDAExecutionProvider", "CPUExecutionProvider") if provider in available_providers]
    realtime_session = ort.InferenceSession(str(REALTIME_MODEL_PATH), providers=providers)
    print(f"✅ Loaded real-time recognition model exported from " f"{REALTIME_MODEL_SOURCE_PATH} | providers: {providers}")
else:
    print(f"⚠️ Real-time model unavailable; expected " f"{REALTIME_MODEL_SOURCE_PATH} and {REALTIME_MODEL_PATH}")

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
NUTRITION_CSV = Path("data_exploration/target_hundred_whole_food_nutrition_info.csv")
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
            # Use energy_kcal (hundred-food CSV) as calories if available
            calories_raw = row.get("energy_kcal", "").strip()
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
async def serve_auth_root():
    """Landing page = authentication (login / sign-up)."""
    return HTMLResponse(content=Path("frontend/auth.html").read_text(encoding="utf-8"))


@app.get("/app", response_class=HTMLResponse)
async def serve_frontend():
    """Main app (dashboard) — reached after authentication."""
    return HTMLResponse(content=Path("frontend/index.html").read_text(encoding="utf-8"))


@app.get("/auth", response_class=HTMLResponse)
async def serve_auth():
    return HTMLResponse(content=Path("frontend/auth.html").read_text(encoding="utf-8"))


# ── Static assets (CSS, JS, images) ─────────────────────────────────────
app.mount("/static", StaticFiles(directory="frontend"), name="static")


# ── Prediction endpoint ─────────────────────────────────────────────────
@app.post("/predict")
async def predict_food(file: UploadFile = File(...)):
    """Receive an image, detect if it's food, then classify if it is."""
    contents = await file.read()

    # Save uploaded bytes to a temporary file
    suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # ── Step 1: Food / Not-Food Detection ──
        detector_img = tf.keras.preprocessing.image.load_img(
            tmp_path,
            target_size=(FOOD_DETECTOR_SIZE, FOOD_DETECTOR_SIZE),
        )
        detector_arr = tf.keras.preprocessing.image.img_to_array(detector_img)
        # Normalize pixel values to [0, 1] — the food detector expects this range
        detector_arr = detector_arr / 255.0
        detector_arr = tf.expand_dims(detector_arr, axis=0)

        detector_pred = food_detector.predict(detector_arr, verbose=0)
        food_score = float(detector_pred[0][0])  # sigmoid output (≈0 = not food, ≈1 = food)

        # If the detector says it's NOT food, return early
        if food_score < FOOD_DETECTOR_THRESHOLD:
            return JSONResponse(
                status_code=400,
                content={
                    "is_food": False,
                    "food_detection_confidence": food_score,
                    "message": "The uploaded image does not appear to be food. Please upload a photo of food.",
                },
            )

        # ── Step 2: Food Classification ──
        image = tf.keras.preprocessing.image.load_img(
            tmp_path,
            target_size=(IMG_SIZE, IMG_SIZE),
        )
        input_arr = tf.keras.preprocessing.image.img_to_array(image)
        input_arr = tf.expand_dims(input_arr, axis=0)

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
        "is_food": True,
        "food_detection_confidence": food_score,
        "prediction": predicted_food,
        "confidence": confidence,
        "top_predictions": top_predictions,
        "nutrition": NUTRITION_DATA.get(predicted_food),
        "image_width": width,
        "image_height": height,
    }


# ── Continuous camera detection endpoint ────────────────────────────────
@app.post("/predict-yolo")
async def predict_camera_frame(file: UploadFile = File(...)):
    """Gate a camera frame as food/not-food, then recognize supported food."""
    if realtime_session is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Real-time food recognition model is unavailable"},
        )

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Could not decode camera frame"})

    try:
        detector_image = image.resize(
            (FOOD_DETECTOR_SIZE, FOOD_DETECTOR_SIZE),
            Image.Resampling.NEAREST,
        )
        detector_array = np.asarray(detector_image, dtype=np.float32) / 255.0
        detector_array = np.expand_dims(detector_array, axis=0)
        detector_prediction = food_detector(detector_array, training=False).numpy()
        food_score = float(detector_prediction[0][0])

        if food_score < FOOD_DETECTOR_THRESHOLD:
            return {
                "is_food": False,
                "food_detection_confidence": food_score,
                "not_food_confidence": 1.0 - food_score,
            }

        recognition_image = image.resize((224, 224), Image.Resampling.BILINEAR)
        recognition_array = np.asarray(recognition_image, dtype=np.float32) / 255.0
        recognition_array = np.transpose(recognition_array, (2, 0, 1))
        recognition_array = np.expand_dims(recognition_array, axis=0).astype(np.float32)

        input_name = realtime_session.get_inputs()[0].name
        probabilities = realtime_session.run(None, {input_name: recognition_array})[0][0]
        probabilities = np.asarray(probabilities, dtype=np.float32)
        if np.any(probabilities < 0) or not np.isclose(probabilities.sum(), 1.0, atol=1e-3):
            exponentials = np.exp(probabilities - np.max(probabilities))
            probabilities = exponentials / exponentials.sum()

        predicted_index = int(np.argmax(probabilities))
        predicted_food = CLASS_NAMES[predicted_index]
        confidence = float(probabilities[predicted_index])
        top_indices = np.argsort(probabilities)[-3:][::-1]
        top_predictions = [
            {
                "label": CLASS_NAMES[int(index)],
                "confidence": float(probabilities[index]),
            }
            for index in top_indices
        ]

        return {
            "is_food": True,
            "food_detection_confidence": food_score,
            "prediction": predicted_food,
            "confidence": confidence,
            "top_predictions": top_predictions,
            "nutrition": NUTRITION_DATA.get(predicted_food),
            "image_width": image.width,
            "image_height": image.height,
            "recognition_model": REALTIME_MODEL_SOURCE_PATH.name,
        }
    except Exception:
        logger.exception("Continuous camera prediction failed")
        return JSONResponse(
            status_code=500,
            content={"error": "Continuous camera prediction failed"},
        )


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

    # 5. Store metadata in PostgreSQL
    try:
        insert_food_metadata(
            image_id=image_id,
            upload_time=upload_time,
            height=height,
            width=width,
            email=email,
            country=country,
            label=label,
            source=source,
        )
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={"error": f"Database storage failed: {error}"},
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
