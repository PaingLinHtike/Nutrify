/* ═══════════════════════════════════════════
   VitaVision App — Frontend Logic
   ═══════════════════════════════════════════ */

// ── DOM References ──────────────────────────────────────────────────────
const uploadZone = document.getElementById("uploadZone");
const uploadContent = document.getElementById("uploadContent");
const uploadPreview = document.getElementById("uploadPreview");
const previewImage = document.getElementById("previewImage");
const fileInput = document.getElementById("fileInput");
const cameraInput = document.getElementById("cameraInput");
const btnCamera = document.getElementById("btnCamera");
const btnGallery = document.getElementById("btnGallery");
const btnRemove = document.getElementById("btnRemove");
const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const btnCameraCapture = document.getElementById("btnCameraCapture");
const btnCameraClose = document.getElementById("btnCameraClose");
const spinnerContainer = document.getElementById("spinnerContainer");
const resultCard = document.getElementById("resultCard");
const resultIcon = document.getElementById("resultIcon");
const resultFood = document.getElementById("resultFood");
const confidenceText = document.getElementById("confidenceText");
const confidenceFill = document.getElementById("confidenceFill");
const topList = document.getElementById("topList");
const topPredictions = document.getElementById("topPredictions");
const btnCorrect = document.getElementById("btnCorrect");
const btnIncorrect = document.getElementById("btnIncorrect");
const correctionForm = document.getElementById("correctionForm");
const foodSearchInput = document.getElementById("foodSearchInput");
const foodDropdown = document.getElementById("foodDropdown");
const foodDropdownList = document.getElementById("foodDropdownList");
const foodSearchClear = document.getElementById("foodSearchClear");
const foodSelectedTag = document.getElementById("foodSelectedTag");
const foodSelectedLabel = document.getElementById("foodSelectedLabel");
const foodTagRemove = document.getElementById("foodTagRemove");
const btnSubmitCorrection = document.getElementById("btnSubmitCorrection");
const nutritionCard = document.getElementById("nutritionCard");
const nCalories = document.getElementById("nCalories");
const nProtein = document.getElementById("nProtein");
const nFat = document.getElementById("nFat");
const nCarbs = document.getElementById("nCarbs");
const barProtein = document.getElementById("barProtein");
const barFat = document.getElementById("barFat");
const barCarbs = document.getElementById("barCarbs");
const nHealthScore = document.getElementById("nHealthScore");
const nHealthFill = document.getElementById("nHealthFill");
const metaForm = document.getElementById("metaForm");
const metadataForm = document.getElementById("metadataForm");
const finalLabel = document.getElementById("finalLabel");
const imageData = document.getElementById("imageData");
const metaEmail = document.getElementById("metaEmail");
const metaCountry = document.getElementById("metaCountry");
const btnSave = document.getElementById("btnSave");
const successState = document.getElementById("successState");
const successImageId = document.getElementById("successImageId");
const successLabel = document.getElementById("successLabel");
const successTime = document.getElementById("successTime");
const btnNewUpload = document.getElementById("btnNewUpload");

// ── State ───────────────────────────────────────────────────────────────
let currentFile = null; // Raw File object from input / drop
let predictionData = null; // Response from /predict

// Food emoji map
const FOOD_EMOJI = {
  apple: "🍎",
  banana: "🍌",
  beef: "🥩",
  blueberries: "🫐",
  carrots: "🥕",
  chicken_wings: "🍗",
  egg: "🥚",
  honey: "🍯",
  mushrooms: "🍄",
  strawberries: "🍓",
  pizza: "🍕",
  pasta: "🍝",
  rice: "🍚",
  bread: "🍞",
  salad: "🥗",
  sushi: "🍣",
  burger: "🍔",
  soup: "🍜",
  sandwich: "🥪",
  fish: "🐟",
  cheese: "🧀",
  yogurt: "🥛",
  noodles: "🍜",
  ice_cream: "🍦",
  cake: "🎂",
  default: "🍽️",
};

// ── Food list (loaded from Supabase food_nutrition) ─────────────────────
let ALL_FOODS = [];

async function loadFoodList() {
  const supabase = window.__supabase;
  if (!supabase) return;
  const { data, error } = await supabase
    .from("food_nutrition")
    .select("food_name")
    .order("food_name");
  if (!error && data) {
    ALL_FOODS = data.map((r) => ({
      key: r.food_name,
      name: r.food_name.replace(/_/g, " "),
      category: "food",
    }));
  }
}

let selectedFood = null; // Currently selected food display name
let selectedFoodKey = null; // DB key (food_nutrition.food_name)

// ── Helpers ─────────────────────────────────────────────────────────────
function getFoodEmoji(label) {
  const key = label.toLowerCase().replace(/\s+/g, "_");
  return FOOD_EMOJI[key] || FOOD_EMOJI.default;
}

function showError(msg) {
  // Remove existing toasts
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function capitalize(str) {
  return str
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatPct(val) {
  return (val * 100).toFixed(1) + "%";
}

function nowISO() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function resetUI() {
  // Hide all dynamic sections
  spinnerContainer.classList.add("hidden");
  resultCard.classList.add("hidden");
  correctionForm.classList.add("hidden");
  nutritionCard.classList.add("hidden");
  metaForm.classList.add("hidden");
  successState.classList.add("hidden");
  uploadZone.classList.remove("has-image");
  uploadContent.classList.remove("hidden");
  uploadPreview.classList.add("hidden");
  previewImage.src = "";
  currentFile = null;
  predictionData = null;
  // Remove any not-food notifications
  document
    .querySelectorAll(".not-food-notification")
    .forEach((el) => el.remove());
  // Reset food search
  selectedFood = null;
  selectedFoodKey = null;
  foodSearchInput.value = "";
  foodDropdown.classList.add("hidden");
  foodSearchClear.classList.add("hidden");
  foodSelectedTag.classList.add("hidden");
  btnSubmitCorrection.classList.add("hidden");
}

// ── Trigger file input ──────────────────────────────────────────────────
uploadZone.addEventListener("click", (e) => {
  // Don't trigger if clicking the remove button or the explicit buttons
  if (e.target.closest(".btn-remove")) return;
  if (e.target.closest(".upload-buttons")) return;
  fileInput.click();
});

// ── Gallery button: native label opens the file picker (no JS needed) ──
// (the <label for="fileInput"> handles clicks by the browser itself)

// ── Camera button: open the phone camera ────────────────────────────────
let cameraStream = null;

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
    navigator.userAgent,
  );
}

async function openPhoneCamera() {
  // Phones: open the native camera app directly via the capture input.
  // This works on plain HTTP (LAN) where getUserMedia is blocked.
  if (isMobileDevice()) {
    cameraInput.value = "";
    cameraInput.click();
    return;
  }

  // Desktop: try the in-app webcam first (works on HTTPS / localhost)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      cameraVideo.srcObject = cameraStream;
      cameraModal.classList.remove("hidden");
      return;
    } catch (err) {
      console.warn("In-app camera unavailable, using file picker:", err);
    }
  }
  // Final fallback: file picker (capture hint for mobile browsers)
  cameraInput.value = "";
  cameraInput.click();
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (t) {
      t.stop();
    });
    cameraStream = null;
  }
  if (cameraVideo) cameraVideo.srcObject = null;
  cameraModal.classList.add("hidden");
}

btnCamera.addEventListener("click", (e) => {
  e.stopPropagation();
  // Mobile: let the native label activation open the camera app directly
  // (capture="environment") — works over plain HTTP, no JS required.
  // Desktop: show the in-app webcam modal instead of the file picker.
  if (!isMobileDevice()) {
    e.preventDefault();
    openPhoneCamera();
  }
});

btnCameraClose.addEventListener("click", closeCamera);

btnCameraCapture.addEventListener("click", function () {
  if (!cameraVideo || !cameraVideo.videoWidth) return;
  var canvas = document.createElement("canvas");
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0);
  canvas.toBlob(
    function (blob) {
      var file = new File([blob], "camera-photo.jpg", {
        type: "image/jpeg",
      });
      closeCamera();
      handleFile(file);
    },
    "image/jpeg",
    0.92,
  );
});

// ── File selection via input ────────────────────────────────────────────
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
    fileInput.value = "";
  }
});

cameraInput.addEventListener("change", () => {
  if (cameraInput.files.length > 0) {
    handleFile(cameraInput.files[0]);
    cameraInput.value = "";
  }
});

// ── Drag & drop ─────────────────────────────────────────────────────────
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("drag-over");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

// ── Remove image ────────────────────────────────────────────────────────
btnRemove.addEventListener("click", (e) => {
  e.stopPropagation();
  resetUI();
  fileInput.value = "";
});

// ── Handle a selected/dropped file ──────────────────────────────────────
function handleFile(file) {
  // Validate
  const validTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!validTypes.includes(file.type)) {
    showError("Please upload a JPG, JPEG, or PNG image.");
    return;
  }

  currentFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadContent.classList.add("hidden");
    uploadPreview.classList.remove("hidden");
    uploadZone.classList.add("has-image");

    // Auto-submit for prediction
    submitForPrediction(file);
  };
  reader.readAsDataURL(file);
}

// ── Submit image to /predict ────────────────────────────────────────────
async function submitForPrediction(file) {
  // Hide previous results, show spinner
  resultCard.classList.add("hidden");
  correctionForm.classList.add("hidden");
  metaForm.classList.add("hidden");
  nutritionCard.classList.add("hidden");
  successState.classList.add("hidden");
  // Remove any previous not-food notification
  document
    .querySelectorAll(".not-food-notification")
    .forEach((el) => el.remove());
  spinnerContainer.classList.remove("hidden");
  var scanOverlay = document.getElementById("scanOverlay");
  if (scanOverlay) scanOverlay.classList.remove("hidden");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/predict", {
      method: "POST",
      body: formData,
    });

    // ── Handle not-food detection (HTTP 400) ──
    if (!response.ok) {
      const err = await response.json();
      spinnerContainer.classList.add("hidden");
      if (scanOverlay) scanOverlay.classList.add("hidden");

      // Check if it's a "not food" response
      if (err.is_food === false) {
        showNotFoodNotification(err.food_detection_confidence);
        return;
      }

      throw new Error(err.error || `Server error: ${response.status}`);
    }

    predictionData = await response.json();
    if (scanOverlay) scanOverlay.classList.add("hidden");
    showResults(predictionData);
  } catch (err) {
    showError(err.message);
    spinnerContainer.classList.add("hidden");
    if (scanOverlay) scanOverlay.classList.add("hidden");
  }
}

// ── Show "Not Food" notification ───────────────────────────────────────
function showNotFoodNotification(confidence) {
  // Remove any existing not-food notification
  document
    .querySelectorAll(".not-food-notification")
    .forEach((el) => el.remove());

  const notif = document.createElement("div");
  notif.className = "not-food-notification";
  notif.innerHTML = `
    <div class="not-food-icon">🚫</div>
    <div class="not-food-content">
      <h3>Not a Food Image</h3>
      <p>The image you uploaded does not appear to be food.
         Please upload a clear photo of food to continue.</p>
      <p class="not-food-confidence">Detection confidence: ${(confidence * 100).toFixed(1)}% (not food)</p>
    </div>
  `;

  // Insert after the upload zone
  uploadZone.parentNode.insertBefore(notif, uploadZone.nextSibling);
  notif.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── Display prediction results ──────────────────────────────────────────
function showResults(data) {
  spinnerContainer.classList.add("hidden");
  resultCard.classList.remove("hidden");

  // Main prediction
  const label = data.prediction;
  const conf = data.confidence;
  resultIcon.textContent = getFoodEmoji(label);
  resultFood.textContent = capitalize(label);
  confidenceText.textContent = formatPct(conf);

  // Animate confidence bar on next frame
  requestAnimationFrame(() => {
    confidenceFill.style.width = (conf * 100).toFixed(1) + "%";
  });

  // Top-3 predictions
  const tops = data.top_predictions || [];
  topList.innerHTML = "";
  tops.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "top-item";
    div.innerHTML = `
      <span class="top-item-label">${capitalize(item.label)}</span>
      <span class="top-item-bar">
        <span class="top-item-track">
          <span class="top-item-fill" style="width: 0%"></span>
        </span>
        <span class="top-item-pct">${formatPct(item.confidence)}</span>
      </span>
    `;
    topList.appendChild(div);

    // Animate bar
    setTimeout(
      () => {
        const fill = div.querySelector(".top-item-fill");
        fill.style.width = (item.confidence * 100).toFixed(1) + "%";
      },
      100 + idx * 100,
    );
  });

  // Scroll to result
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── Health score (mirrors main.py calculate_health_score) ──────────────
function calculateHealthScore(protein, fat, carbs, calories) {
  let score = 5.0;
  if (protein >= 25) score += 2;
  else if (protein >= 15) score += 1;
  else if (protein >= 5) score += 0.5;
  if (fat <= 5) score += 2;
  else if (fat <= 15) score += 1;
  else if (fat > 30) score -= 2;
  if (carbs <= 50) score += 1;
  else if (carbs > 70) score -= 1;
  if (calories <= 200) score += 1;
  else if (calories > 400) score -= 1;
  return Math.round(Math.max(0, Math.min(score, 10)) * 10) / 10;
}

// ── Nutrition lookup (reads Supabase food_nutrition) ───────────────────
async function showNutritionCard(foodKey) {
  if (!nutritionCard || !nCalories) return;
  const supabase = window.__supabase;
  if (!supabase) {
    nutritionCard.classList.add("hidden");
    return;
  }

  const normalized = String(foodKey || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  const { data, error } = await supabase
    .from("food_nutrition")
    .select(
      "calories_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g",
    )
    .eq("food_name", normalized)
    .maybeSingle();

  if (error || !data) {
    nutritionCard.classList.add("hidden");
    return;
  }

  const calories = parseFloat(data.calories_per_100g) || 0;
  const protein = parseFloat(data.protein_g_per_100g) || 0;
  const fat = parseFloat(data.fat_g_per_100g) || 0;
  const carbs = parseFloat(data.carbs_g_per_100g) || 0;
  const score = calculateHealthScore(protein, fat, carbs, calories);

  // Calories
  nCalories.textContent = Math.round(calories);
  // Macros
  nProtein.textContent = protein.toFixed(1) + "g";
  nFat.textContent = fat.toFixed(1) + "g";
  nCarbs.textContent = carbs.toFixed(1) + "g";
  // Macro bar widths (relative to max 50g protein, 50g fat, 100g carbs)
  const pct = (v, max) => Math.min((v / max) * 100, 100);
  barProtein.style.width = pct(protein, 50) + "%";
  barFat.style.width = pct(fat, 50) + "%";
  barCarbs.style.width = pct(carbs, 100) + "%";
  // Health Score
  nHealthScore.textContent = score + "/10";
  nHealthFill.style.width = (score / 10) * 100 + "%";
  // Color by score
  if (score >= 8) {
    nHealthFill.style.background = "linear-gradient(90deg, #22c55e, #16a34a)";
    nHealthScore.style.color = "#16a34a";
  } else if (score >= 5) {
    nHealthFill.style.background = "linear-gradient(90deg, #fbbf24, #f59e0b)";
    nHealthScore.style.color = "#d97706";
  } else {
    nHealthFill.style.background = "linear-gradient(90deg, #f87171, #ef4444)";
    nHealthScore.style.color = "#dc2626";
  }
  nutritionCard.classList.remove("hidden");
}

// ── "Correct" button ────────────────────────────────────────────────────
btnCorrect.addEventListener("click", () => {
  if (!predictionData) return;
  correctionForm.classList.add("hidden");
  showNutritionCard(predictionData.prediction);
  // Only show legacy metaForm if NOT authenticated
  if (!window.__supabase) {
    showMetaForm(predictionData.prediction);
  }
});

// ── "Incorrect" button ──────────────────────────────────────────────────
btnIncorrect.addEventListener("click", () => {
  correctionForm.classList.remove("hidden");
  selectedFood = null;
  selectedFoodKey = null;
  foodSearchInput.value = "";
  foodSearchInput.focus();
  foodSelectedTag.classList.add("hidden");
  btnSubmitCorrection.classList.add("hidden");
  renderFoodDropdown(getFilteredFoods(""));
  foodDropdown.classList.remove("hidden");
});

// ── Food search dropdown ────────────────────────────────────────────────
function getFilteredFoods(query) {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_FOODS;
  return ALL_FOODS.filter((f) => f.name.toLowerCase().includes(q));
}

function renderFoodDropdown(foods) {
  foodDropdownList.innerHTML = "";

  if (foods.length === 0) {
    foodDropdownList.innerHTML =
      '<div class="food-dropdown-empty">No foods found. Type a custom name.</div>';
    return;
  }

  foods.forEach((food) => appendFoodItem(food));
}

function appendFoodItem(food) {
  const item = document.createElement("div");
  item.className = "food-dropdown-item";
  if (selectedFood === food.name) item.classList.add("selected");

  const emoji = getFoodEmoji(food.key || food.name);
  const checkMark = selectedFood === food.name ? "✓" : "";

  item.innerHTML = `
    <span class="food-item-emoji">${emoji}</span>
    <span class="food-item-name">${food.name}</span>
    <span class="food-item-check">${checkMark}</span>
  `;

  item.addEventListener("click", () => selectFood(food.name, food.key));
  foodDropdownList.appendChild(item);
}

function selectFood(name, key) {
  selectedFood = name;
  selectedFoodKey = key || null;
  foodSearchInput.value = name;
  foodDropdown.classList.add("hidden");
  foodSearchClear.classList.remove("hidden");
  foodSelectedTag.classList.remove("hidden");
  foodSelectedLabel.textContent = name;
  btnSubmitCorrection.classList.remove("hidden");
}

// ── Search input events ─────────────────────────────────────────────────
foodSearchInput.addEventListener("input", () => {
  const query = foodSearchInput.value;
  if (query) {
    foodSearchClear.classList.remove("hidden");
  } else {
    foodSearchClear.classList.add("hidden");
  }
  renderFoodDropdown(getFilteredFoods(query));
  foodDropdown.classList.remove("hidden");
});

foodSearchInput.addEventListener("focus", () => {
  renderFoodDropdown(getFilteredFoods(foodSearchInput.value));
  foodDropdown.classList.remove("hidden");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".food-search-container")) {
    foodDropdown.classList.add("hidden");
  }
});

// Clear search
foodSearchClear.addEventListener("click", () => {
  foodSearchInput.value = "";
  foodSearchClear.classList.add("hidden");
  selectedFood = null;
  selectedFoodKey = null;
  renderFoodDropdown(ALL_FOODS);
  foodDropdown.classList.remove("hidden");
  foodSearchInput.focus();
});

// Remove selected tag
foodTagRemove.addEventListener("click", () => {
  selectedFood = null;
  selectedFoodKey = null;
  foodSelectedTag.classList.add("hidden");
  btnSubmitCorrection.classList.add("hidden");
  foodSearchInput.value = "";
  foodSearchClear.classList.add("hidden");
  foodSearchInput.focus();
});

// Allow Enter key in search field to select first visible match
foodSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const visibleItems = foodDropdownList.querySelectorAll(
      ".food-dropdown-item",
    );
    if (visibleItems.length > 0 && selectedFood) {
      btnSubmitCorrection.click();
    } else if (visibleItems.length > 0) {
      // Select the first visible item
      const firstName =
        visibleItems[0].querySelector(".food-item-name").textContent;
      selectFood(firstName);
    }
  }
});

// ── Submit correction ───────────────────────────────────────────────────
btnSubmitCorrection.addEventListener("click", () => {
  const corrected = selectedFood || foodSearchInput.value.trim();
  if (!corrected) {
    showError("Please select or type a food name.");
    return;
  }
  correctionForm.classList.add("hidden");
  showNutritionCard(selectedFoodKey || corrected);
  // Only show legacy metaForm if NOT authenticated
  if (!window.__supabase) {
    showMetaForm(corrected);
  }
});

// ── Show metadata form ──────────────────────────────────────────────────
function showMetaForm(label) {
  finalLabel.value = label;
  metaForm.classList.remove("hidden");
  metaForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── Submit metadata + image to /confirm ─────────────────────────────────
metadataForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const label = finalLabel.value;
  if (!currentFile) {
    showError("No image file available. Please re-upload.");
    return;
  }

  btnSave.disabled = true;
  btnSave.textContent = "⏳ Saving...";

  const formData = new FormData();
  formData.append("file", currentFile);
  formData.append("label", label);
  formData.append("email", metaEmail.value.trim());
  formData.append("country", metaCountry.value.trim());
  formData.append("source", "web-app");

  try {
    const response = await fetch("/confirm", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    showSuccess();
  } catch (err) {
    showError(err.message);
    btnSave.disabled = false;
    btnSave.textContent = "💾 Save to Database";
  }
});

// ── Show success state ──────────────────────────────────────────────────
function showSuccess() {
  metaForm.classList.add("hidden");
  resultCard.classList.add("hidden");
  nutritionCard.classList.add("hidden");
  successState.classList.remove("hidden");
  successState.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── "Upload Another" button ─────────────────────────────────────────────
btnNewUpload.addEventListener("click", () => {
  resetUI();
  fileInput.value = "";
  metaEmail.value = "";
  metaCountry.value = "";
  uploadZone.scrollIntoView({ behavior: "smooth", block: "center" });
});

// ── Load the food list for the correction dropdown ──────────────────────
loadFoodList();
