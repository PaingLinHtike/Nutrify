"""Test loading the food-10 model and making a dummy prediction."""

from pathlib import Path
import numpy as np
import tensorflow as tf

model_path = Path("model/food-10-version.keras")
print(f"Loading model from: {model_path}")
model = tf.keras.models.load_model(str(model_path))
print(f"✅ Model loaded successfully!")
print(f"   Input shape: {model.input_shape}")
print(f"   Output shape: {model.output_shape}")

# Dummy prediction
dummy = np.random.randn(1, 380, 380, 3).astype(np.float32)
preds = model.predict(dummy, verbose=0)

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

top_idx = int(np.argmax(preds[0]))
print(f"✅ Dummy prediction: {CLASS_NAMES[top_idx]} ({float(preds[0][top_idx]):.2%})")
print(f"\n🎉 Model is ready!")
