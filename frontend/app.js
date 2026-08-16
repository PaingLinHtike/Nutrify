/* ═══════════════════════════════════════════
   VitaVision App — Frontend Logic
   ═══════════════════════════════════════════ */

// ── DOM References ──────────────────────────────────────────────────────
const uploadZone = document.getElementById("uploadZone");
const uploadContent = document.getElementById("uploadContent");
const uploadPreview = document.getElementById("uploadPreview");
const previewImage = document.getElementById("previewImage");
const fileInput = document.getElementById("fileInput");
const btnCamera = document.getElementById("btnCamera");
const btnGallery = document.getElementById("btnGallery");
const btnRemove = document.getElementById("btnRemove");
const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const btnCameraCapture = document.getElementById("btnCameraCapture");
const btnCameraClose = document.getElementById("btnCameraClose");
const cameraLiveStatus = document.getElementById("cameraLiveStatus");
const cameraLiveText = document.getElementById("cameraLiveText");
const cameraDetectionHint = document.getElementById("cameraDetectionHint");
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
const confirmationChoices = document.getElementById("confirmationChoices");
const btnSaveMeal = document.getElementById("btnSaveMeal");
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
const saveMeal = document.getElementById("saveMeal");
const servingSize = document.getElementById("servingSize");
const saveMealNote = document.getElementById("saveMealNote");
const nutritionServingWeight = document.getElementById("nutritionServingWeight");
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
let currentSource = "gallery";
let currentNutritionPer100g = null;

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

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const summary = text.replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(
      `Server returned ${response.status}: ${summary || "Invalid response"}`,
    );
  }
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
  confirmationChoices.classList.remove("hidden");
  btnSaveMeal.classList.add("hidden");
  uploadZone.classList.remove("has-image");
  uploadContent.classList.remove("hidden");
  uploadPreview.classList.add("hidden");
  previewImage.src = "";
currentFile = null;
  predictionData = null;
  currentSource = "gallery";
  currentNutritionPer100g = null;
  window.__foodImageFile = null;
  saveMeal.classList.add("hidden");
  servingSize.value = "100";
  saveMealNote.textContent = "";
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

// ── Live camera + continuous food detection ─────────────────────────────
let cameraStream = null;
let liveDetectionTimer = null;
let liveDetectionController = null;
let liveDetectionErrorLogged = false;

function setLiveDetectionState(state, text, hint) {
  cameraLiveStatus.dataset.state = state;
  cameraLiveText.textContent = text;
  cameraDetectionHint.textContent = hint;
}

function scheduleLiveDetection(delay = 500) {
  clearTimeout(liveDetectionTimer);
  if (cameraStream) liveDetectionTimer = setTimeout(detectLiveFrame, delay);
}

async function detectLiveFrame() {
  if (!cameraStream || cameraVideo.readyState < 2 || !cameraVideo.videoWidth) {
    scheduleLiveDetection(300);
    return;
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 320 / cameraVideo.videoWidth);
  canvas.width = Math.round(cameraVideo.videoWidth * scale);
  canvas.height = Math.round(cameraVideo.videoHeight * scale);
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.72),
  );
  if (!blob || !cameraStream) return;

  const formData = new FormData();
  formData.append("file", blob, "live-frame.jpg");
  const controller = new AbortController();
  liveDetectionController = controller;
  let nextDelay = 700;

  try {
    const response = await fetch("/predict-yolo", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || `Server error: ${response.status}`);

    liveDetectionErrorLogged = false;
    if (!data.is_food) {
      setLiveDetectionState("no-food", "No Food", "Point camera at food");
    } else {
      setLiveDetectionState(
        "food",
        `${capitalize(data.prediction)} ${formatPct(data.confidence)}`,
        "Food detected - ready to capture",
      );
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    nextDelay = 5000;
    if (!liveDetectionErrorLogged) {
      console.warn("Live food detection unavailable:", err);
      liveDetectionErrorLogged = true;
    }
    setLiveDetectionState(
      "error",
      "AI scanner unavailable",
      "Retrying live detection...",
    );
  } finally {
    if (liveDetectionController === controller) liveDetectionController = null;
    if (!controller.signal.aborted) scheduleLiveDetection(nextDelay);
  }
}

async function openLiveCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showError("Live camera requires HTTPS and camera permission.");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    cameraVideo.srcObject = cameraStream;
    cameraModal.classList.remove("hidden");
    liveDetectionErrorLogged = false;
    setLiveDetectionState(
      "scanning",
      "Scanning for food...",
      "Center food in frame",
    );
    await cameraVideo.play();
    scheduleLiveDetection();
  } catch (err) {
    closeCamera();
    const message =
      err.name === "NotAllowedError"
        ? "Camera permission was denied. Allow access and try again."
        : "Unable to open the camera. Check whether another app is using it.";
    showError(message);
    console.error("Camera error:", err);
  }
}

function closeCamera() {
  clearTimeout(liveDetectionTimer);
  liveDetectionTimer = null;
  if (liveDetectionController) {
    liveDetectionController.abort();
    liveDetectionController = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraModal.classList.add("hidden");
}

btnCamera.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  openLiveCamera();
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
      handleFile(file, "camera");
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
function handleFile(file, source = "gallery") {
  // Validate
  const validTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!validTypes.includes(file.type)) {
    showError("Please upload a JPG, JPEG, or PNG image.");
    return;
  }

currentFile = file;
  currentSource = source;
  window.__foodImageFile = file;

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

// ── Submit image to the gallery or camera prediction pipeline ──────────
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
  const endpoint = currentSource === "camera" ? "/predict-yolo" : "/predict";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      spinnerContainer.classList.add("hidden");
      if (scanOverlay) scanOverlay.classList.add("hidden");

      if (data.is_food === false) {
        showNotFoodNotification(
          data.not_food_confidence ?? 1 - data.food_detection_confidence,
        );
        return;
      }

      throw new Error(data.error || `Server error: ${response.status}`);
    }

    if (data.is_food === false) {
      spinnerContainer.classList.add("hidden");
      if (scanOverlay) scanOverlay.classList.add("hidden");
      showNotFoodNotification(
        data.not_food_confidence ?? 1 - data.food_detection_confidence,
      );
      return;
    }

    predictionData = data;
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
      <p class="not-food-confidence">Not-food confidence: ${(confidence * 100).toFixed(1)}%</p>
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

// ── Nutrition lookup and serving-size calculation ──────────────────────
function normalizeNutrition(raw) {
  if (!raw) return null;
  const numberFrom = (...keys) => {
    for (const key of keys) {
      const value = Number.parseFloat(raw[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  };
  return {
    calories: numberFrom("calories", "calories_per_100g"),
    protein: numberFrom("protein", "protein_g_per_100g"),
    fat: numberFrom("fat", "fat_g_per_100g"),
    carbs: numberFrom("carbohydrate", "carbs", "carbs_g_per_100g"),
    healthScore: numberFrom("health_score"),
  };
}

function formatNutrient(value) {
  return String(Math.round(value));
}

function renderNutritionForServing() {
  if (!currentNutritionPer100g) return;
  const weight = Number.parseFloat(servingSize.value);
  if (!Number.isFinite(weight) || weight < 1 || weight > 2000) {
    nutritionCard.classList.add("hidden");
    saveMealNote.textContent = "Enter a weight between 1 g and 2000 g.";
    return;
  }

  saveMealNote.textContent = "";
  const scale = weight / 100;
  const calories = currentNutritionPer100g.calories * scale;
  const protein = currentNutritionPer100g.protein * scale;
  const fat = currentNutritionPer100g.fat * scale;
  const carbs = currentNutritionPer100g.carbs * scale;
  const score =
    currentNutritionPer100g.healthScore ||
    calculateHealthScore(
      currentNutritionPer100g.protein,
      currentNutritionPer100g.fat,
      currentNutritionPer100g.carbs,
      currentNutritionPer100g.calories,
    );

  nutritionServingWeight.textContent = `${formatNutrient(weight)} g`;
  nCalories.textContent = formatNutrient(calories);
  nProtein.textContent = formatNutrient(protein) + "g";
  nFat.textContent = formatNutrient(fat) + "g";
  nCarbs.textContent = formatNutrient(carbs) + "g";

  const percentage = (value, maximum) =>
    Math.min((value / maximum) * 100, 100) + "%";
  barProtein.style.setProperty("--fill-width", percentage(protein, 50));
  barFat.style.setProperty("--fill-width", percentage(fat, 50));
  barCarbs.style.setProperty("--fill-width", percentage(carbs, 100));

  nHealthScore.textContent = score + "/10";
  nHealthFill.style.width = (score / 10) * 100 + "%";
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

async function showNutritionCard(foodKey, providedNutrition = null) {
  if (!nutritionCard || !nCalories) return;
  saveMeal.classList.remove("hidden");
  saveMealNote.textContent = "Loading nutrition data...";

  let nutrition = normalizeNutrition(providedNutrition);
  const supabase = window.__supabase;
  if (!nutrition && supabase) {
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
    if (!error) nutrition = normalizeNutrition(data);
  }

  if (!nutrition) {
    currentNutritionPer100g = null;
    nutritionCard.classList.add("hidden");
    saveMealNote.textContent = "Nutrition data is unavailable for this food.";
    return;
  }

  currentNutritionPer100g = nutrition;
  renderNutritionForServing();
  saveMeal.scrollIntoView({ behavior: "smooth", block: "center" });
}

servingSize.addEventListener("input", renderNutritionForServing);

// ── Meal detail modal (shared with tracker.js / history.js) ────────────
var MEAL_TYPE_ICONS = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍿" };

function mealDetailTime(loggedAt) {
  var d = new Date(loggedAt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

window.buildMealItemHTML = function (m, imageUrl, clickable) {
  var t = mealDetailTime(m.logged_at);
  if (clickable === false) {
    return (
      '<div class="meal-item">' +
      '<span class="meal-item-icon">' +
      (MEAL_TYPE_ICONS[m.meal_type] || "🍽️") +
      "</span>" +
      '<span class="meal-item-name">' +
      m.food_name +
      "</span>" +
      '<span class="meal-item-cals">' +
      Math.round(parseFloat(m.calories) || 0) +
      " kcal</span>" +
      '<span class="meal-item-time">' +
      t +
      "</span>" +
      '<span class="meal-item-type">' +
      m.meal_type +
      "</span>" +
      "</div>"
    );
  }
  var lead = imageUrl
    ? '<img class="meal-item-thumb" src="' + imageUrl + '" alt="' + m.food_name + '" loading="lazy" />'
    : '<span class="meal-item-icon">' + (MEAL_TYPE_ICONS[m.meal_type] || "🍽️") + "</span>";
  return (
    '<button type="button" class="meal-item meal-item-btn" data-meal-id="' +
    m.id +
    '">' +
    lead +
    '<span class="meal-item-name">' +
    m.food_name +
    "</span>" +
    '<span class="meal-item-cals">' +
    Math.round(parseFloat(m.calories) || 0) +
    " kcal</span>" +
    '<span class="meal-item-time">' +
    t +
    "</span>" +
    '<span class="meal-item-type">' +
    m.meal_type +
    "</span>" +
    "</button>"
  );
};

window.bindMealItemClicks = function (container, meals, imageMap) {
  if (!container) return;
  container.querySelectorAll(".meal-item-btn").forEach(function (el) {
    el.addEventListener("click", function () {
      var id = el.getAttribute("data-meal-id");
      var meal = (meals || []).find(function (m) {
        return String(m.id) === String(id);
      });
      if (meal) {
        meal.image_url = (imageMap || {})[meal.image_id] || null;
        window.openMealDetail(meal);
      }
    });
  });
};

window.fetchMealImages = async function (imageIds) {
  var map = {};
  if (!window.__supabase) return map;
  var ids = (imageIds || []).filter(Boolean);
  if (!ids.length) return map;
  var CHUNK = 50;
  for (var i = 0; i < ids.length; i += CHUNK) {
    var { data, error } = await window.__supabase
      .from("food_images")
      .select("id, image_url")
      .in("id", ids.slice(i, i + CHUNK));
    if (!error && data) {
      data.forEach(function (r) {
        map[r.id] = r.image_url;
      });
    }
  }
  return map;
};

window.openMealDetail = function (meal) {
  var modal = document.getElementById("mealDetailModal");
  var img = document.getElementById("mealDetailImage");
  var noImg = document.getElementById("mealDetailNoImage");
  var nameEl = document.getElementById("mealDetailName");
  var metaEl = document.getElementById("mealDetailMeta");
  var servingEl = document.getElementById("mealDetailServing");
  var calEl = document.getElementById("mealDetailCal");
  var proEl = document.getElementById("mealDetailPro");
  var fatEl = document.getElementById("mealDetailFat");
  var carbsEl = document.getElementById("mealDetailCarbs");
  if (!modal || !nameEl) return;

  if (meal.image_url) {
    img.src = meal.image_url;
    img.classList.remove("hidden");
    if (noImg) noImg.classList.add("hidden");
  } else {
    img.src = "";
    img.classList.add("hidden");
    if (noImg) noImg.classList.remove("hidden");
  }

  nameEl.textContent = meal.food_name;
  metaEl.textContent =
    (MEAL_TYPE_ICONS[meal.meal_type] || "🍽️") +
    " " +
    meal.meal_type +
    " · " +
    mealDetailTime(meal.logged_at);
  servingEl.textContent = Math.round(parseFloat(meal.serving_size_g) || 0) + " g";
  calEl.textContent = Math.round(parseFloat(meal.calories) || 0);
  proEl.textContent = Math.round(parseFloat(meal.protein_g) || 0) + "g";
  fatEl.textContent = Math.round(parseFloat(meal.fat_g) || 0) + "g";
  carbsEl.textContent = Math.round(parseFloat(meal.carbs_g) || 0) + "g";

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
};

window.closeMealDetail = function () {
  var modal = document.getElementById("mealDetailModal");
  if (modal) modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

(function wireMealDetailModal() {
  var modal = document.getElementById("mealDetailModal");
  if (!modal) return;
  var closeBtn = document.getElementById("mealDetailClose");
  var closeBtn2 = document.getElementById("mealDetailCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", window.closeMealDetail);
  if (closeBtn2) closeBtn2.addEventListener("click", window.closeMealDetail);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) window.closeMealDetail();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") window.closeMealDetail();
  });
  // Close whenever the active view changes so it never lingers over another page
  window.addEventListener("hashchange", window.closeMealDetail);
})();

// ── "Correct" button ────────────────────────────────────────────────────
btnCorrect.addEventListener("click", () => {
  if (!predictionData) return;
  correctionForm.classList.add("hidden");
  confirmationChoices.classList.add("hidden");
  btnSaveMeal.classList.remove("hidden");
  showNutritionCard(predictionData.prediction, predictionData.nutrition);
  // Only show legacy metaForm if NOT authenticated
  if (!window.__supabase) {
    showMetaForm(predictionData.prediction);
  }
});

// ── "Incorrect" button ──────────────────────────────────────────────────
btnIncorrect.addEventListener("click", () => {
  confirmationChoices.classList.add("hidden");
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
  confirmationChoices.classList.add("hidden");
  btnSaveMeal.classList.remove("hidden");
  resultFood.textContent = capitalize(corrected);
  resultIcon.textContent = getFoodEmoji(selectedFoodKey || corrected);
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
