"""
Nutrify — Real-time food detection test (VS Code / local machine)
===================================================================
Runs the real-time food recognition model on live webcam
frames using ONNX Runtime — no PyTorch required.

Usage:
    python scripts/realtime_food_detection.py            # webcam mode
    python scripts/realtime_food_detection.py photo.jpg  # single image
    python scripts/realtime_food_detection.py --samples  # run on sample_food_images/

Controls (webcam mode):
    q / ESC  → quit

Requirements:
    pip install onnxruntime opencv-python numpy
"""

import argparse
import sys
import time
from pathlib import Path

import cv2
import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    sys.exit("onnxruntime is not installed.\n" "Run:  pip install onnxruntime opencv-python numpy")

# ── Config ──────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "realtime_food_recognition.onnx"
CLASS_NAMES_PATH = Path(__file__).resolve().parents[1] / "model" / "realtime_food_classes.txt"
IMGSZ = 224  # the model was trained/exported at 224x224

# Class order from training (folder names sorted alphabetically in the
# training notebook's YAML). beef_meat is displayed as "beef" in the app.
CLASS_NAMES = [
    "apple",
    "banana",
    "beef_meat",
    "blueberries",
    "carrots",
    "chicken_wings",
    "egg",
    "honey",
    "mushrooms",
    "strawberries",
]
DISPLAY_NAMES = {"beef_meat": "beef"}

if CLASS_NAMES_PATH.exists():
    exported_class_names = [name.strip() for name in CLASS_NAMES_PATH.read_text(encoding="utf-8").splitlines() if name.strip()]
    if exported_class_names:
        CLASS_NAMES = exported_class_names

SAMPLE_DIR = Path(__file__).resolve().parents[1] / "sample_food_images"


# ── Model ───────────────────────────────────────────────────────────────
def load_session(model_path: Path) -> ort.InferenceSession:
    if not model_path.exists():
        sys.exit(f"Model not found: {model_path}\nExport realtime_food_recognition.pt to ONNX first.")
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    available = ort.get_available_providers()
    providers = [p for p in providers if p in available]
    session = ort.InferenceSession(str(model_path), providers=providers)
    output_count = session.get_outputs()[0].shape[-1]
    if isinstance(output_count, int) and output_count != len(CLASS_NAMES):
        sys.exit(f"Model has {output_count} outputs, but {len(CLASS_NAMES)} class names are configured. " f"Copy the matching {CLASS_NAMES_PATH.name} file into model/.")
    print(f"Loaded: {model_path}  |  classes: {len(CLASS_NAMES)}  |  providers: {providers}")
    return session


def preprocess(frame_bgr: np.ndarray) -> np.ndarray:
    """BGR frame → RGB float32 tensor [1, 3, 224, 224] normalized to [0,1]."""
    img = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMGSZ, IMGSZ), interpolation=cv2.INTER_LINEAR)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))  # HWC → CHW
    return img[np.newaxis, ...]  # add batch dim


def predict(session, frame_bgr: np.ndarray):
    """Run inference and return (label, confidence, scores)."""
    tensor = preprocess(frame_bgr)
    input_name = session.get_inputs()[0].name
    scores = session.run(None, {input_name: tensor})[0][0]
    top_idx = int(np.argmax(scores))
    return CLASS_NAMES[top_idx], float(scores[top_idx]), scores


def draw_label(frame, label: str, conf: float, fps: float | None = None):
    text = f"{label}  {conf:.2f}"
    if fps is not None:
        text += f"  |  {fps:.1f} FPS"
    cv2.putText(frame, text, (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 220, 0), 2, cv2.LINE_AA)


# ── Modes ───────────────────────────────────────────────────────────────
def run_webcam(session):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("⚠️  No webcam found — is another app using it?")
        print("    (Windows: Settings → Privacy → Camera → allow desktop apps)")
        return

    print("Live detection started — press 'q' or ESC to quit")
    prev = time.time()
    fps = 0.0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        label, conf, _ = predict(session, frame)
        now = time.time()
        fps = 0.9 * fps + 0.1 / max(now - prev, 1e-6)
        prev = now
        draw_label(frame, DISPLAY_NAMES.get(label, label), conf, fps)
        cv2.imshow("Nutrify - Real-time Food Detection", frame)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break
    cap.release()
    cv2.destroyAllWindows()


def run_image(session, image_path: Path):
    frame = cv2.imread(str(image_path))
    if frame is None:
        sys.exit(f"Could not read image: {image_path}")
    label, conf, scores = predict(session, frame)
    draw_label(frame, DISPLAY_NAMES.get(label, label), conf)
    print(f"Prediction: {DISPLAY_NAMES.get(label, label)}  ({conf:.2f})")
    print("All scores:")
    for name, s in sorted(zip(CLASS_NAMES, scores), key=lambda t: -t[1]):
        print(f"  {DISPLAY_NAMES.get(name, name):<14} {s:.3f}")
    cv2.imshow("Nutrify - Prediction", frame)
    print("Press any key to close the window.")
    cv2.waitKey(0)
    cv2.destroyAllWindows()


def run_samples(session):
    imgs = sorted(p for p in SAMPLE_DIR.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    if not imgs:
        sys.exit(f"No images found in {SAMPLE_DIR}")
    print(f"Testing on {len(imgs)} sample images:\n")
    for p in imgs:
        frame = cv2.imread(str(p))
        if frame is None:
            continue
        label, conf, _ = predict(session, frame)
        print(f"  {p.name:<20} → {DISPLAY_NAMES.get(label, label):<14} {conf:.2f}")


# ── Main ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nutrify real-time food detection")
    parser.add_argument("image", nargs="?", help="path to a single image")
    parser.add_argument("--samples", action="store_true", help="run on sample_food_images/ instead of the webcam")
    args = parser.parse_args()

    session = load_session(MODEL_PATH)

    if args.image:
        run_image(session, Path(args.image))
    elif args.samples:
        run_samples(session)
    else:
        run_webcam(session)
