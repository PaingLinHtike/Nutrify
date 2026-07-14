/* ═══════════════════════════════════════════
   VitaVision App — Frontend Logic
   ═══════════════════════════════════════════ */

// ── DOM References ──────────────────────────────────────────────────────
const uploadZone = document.getElementById("uploadZone");
const uploadContent = document.getElementById("uploadContent");
const uploadPreview = document.getElementById("uploadPreview");
const previewImage = document.getElementById("previewImage");
const fileInput = document.getElementById("fileInput");
const btnRemove = document.getElementById("btnRemove");
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

// ── Full food list (mirrors main.py CLASS_NAMES + extra suggestions) ────
const ALL_FOODS = [
  // Model classes (CLASS_NAMES from backend)
  { name: "Apple", category: "model" },
  { name: "Banana", category: "model" },
  { name: "Beef", category: "model" },
  { name: "Blueberries", category: "model" },
  { name: "Carrots", category: "model" },
  { name: "Chicken Wings", category: "model" },
  { name: "Egg", category: "model" },
  { name: "Honey", category: "model" },
  { name: "Mushrooms", category: "model" },
  { name: "Strawberries", category: "model" },
  // Extra common foods
  { name: "Pizza", category: "extra" },
  { name: "Pasta", category: "extra" },
  { name: "Rice", category: "extra" },
  { name: "Bread", category: "extra" },
  { name: "Salad", category: "extra" },
  { name: "Sushi", category: "extra" },
  { name: "Burger", category: "extra" },
  { name: "Soup", category: "extra" },
  { name: "Sandwich", category: "extra" },
  { name: "Fish", category: "extra" },
  { name: "Cheese", category: "extra" },
  { name: "Yogurt", category: "extra" },
  { name: "Noodles", category: "extra" },
  { name: "Ice Cream", category: "extra" },
  { name: "Cake", category: "extra" },
];

let selectedFood = null; // Currently selected food name

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
  // Reset food search
  selectedFood = null;
  foodSearchInput.value = "";
  foodDropdown.classList.add("hidden");
  foodSearchClear.classList.add("hidden");
  foodSelectedTag.classList.add("hidden");
  btnSubmitCorrection.classList.add("hidden");
}

// ── Trigger file input ──────────────────────────────────────────────────
uploadZone.addEventListener("click", (e) => {
  // Don't trigger if clicking the remove button
  if (e.target.closest(".btn-remove")) return;
  fileInput.click();
});

// ── File selection via input ────────────────────────────────────────────
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
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
  successState.classList.add("hidden");
  spinnerContainer.classList.remove("hidden");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/predict", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    predictionData = await response.json();
    showResults(predictionData);
  } catch (err) {
    showError(err.message);
    spinnerContainer.classList.add("hidden");
  }
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

// ── Nutrition lookup map (client-side copy) ────────────────────────────
const NUTRITION_MAP = {
  apple: { protein: 0.2, fat: 0.2, carbs: 14.8, calories: 56, healthScore: 9 },
  banana: { protein: 0.7, fat: 0.3, carbs: 23.0, calories: 88, healthScore: 9 },
  beef: { protein: 27.3, fat: 11.4, carbs: 0.0, calories: 219, healthScore: 9 },
  chicken_wings: {
    protein: 23.9,
    fat: 6.0,
    carbs: 0.0,
    calories: 156,
    healthScore: 9,
  },
  carrots: { protein: 0.8, fat: 0.5, carbs: 7.9, calories: 37, healthScore: 9 },
  egg: { protein: 48.1, fat: 39.8, carbs: 1.9, calories: 576, healthScore: 5 },
  mushrooms: {
    protein: 2.9,
    fat: 0.4,
    carbs: 4.1,
    calories: 25,
    healthScore: 9,
  },
  strawberries: {
    protein: 0.6,
    fat: 0.2,
    carbs: 7.6,
    calories: 31,
    healthScore: 9,
  },
};

function showNutritionCard(foodName) {
  const key = foodName.toLowerCase().replace(/\s+/g, "_");
  const n = NUTRITION_MAP[key];
  if (n) {
    // Calories
    nCalories.textContent = n.calories;
    // Macros
    nProtein.textContent = n.protein.toFixed(1) + "g";
    nFat.textContent = n.fat.toFixed(1) + "g";
    nCarbs.textContent = n.carbs.toFixed(1) + "g";
    // Macro bar widths (relative to max 50g protein, 50g fat, 100g carbs)
    const pct = (v, max) => Math.min((v / max) * 100, 100);
    barProtein.style.width = pct(n.protein, 50) + "%";
    barFat.style.width = pct(n.fat, 50) + "%";
    barCarbs.style.width = pct(n.carbs, 100) + "%";
    // Health Score
    const score = n.healthScore;
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
  } else {
    nutritionCard.classList.add("hidden");
  }
}

// ── "Correct" button ────────────────────────────────────────────────────
btnCorrect.addEventListener("click", () => {
  if (!predictionData) return;
  correctionForm.classList.add("hidden");
  showNutritionCard(predictionData.prediction);
  showMetaForm(predictionData.prediction);
});

// ── "Incorrect" button ──────────────────────────────────────────────────
btnIncorrect.addEventListener("click", () => {
  correctionForm.classList.remove("hidden");
  selectedFood = null;
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

  // Group by category
  const modelFoods = foods.filter((f) => f.category === "model");
  const extraFoods = foods.filter((f) => f.category === "extra");

  if (modelFoods.length > 0) {
    const header = document.createElement("div");
    header.className = "food-dropdown-category";
    header.textContent = "🍽️ Model Classes";
    foodDropdownList.appendChild(header);

    modelFoods.forEach((food) => appendFoodItem(food));
  }

  if (extraFoods.length > 0) {
    const header = document.createElement("div");
    header.className = "food-dropdown-category";
    header.textContent = "✨ Suggestions";
    foodDropdownList.appendChild(header);

    extraFoods.forEach((food) => appendFoodItem(food));
  }
}

function appendFoodItem(food) {
  const item = document.createElement("div");
  item.className = "food-dropdown-item";
  if (selectedFood === food.name) item.classList.add("selected");

  const emoji = getFoodEmoji(food.name);
  const checkMark = selectedFood === food.name ? "✓" : "";

  item.innerHTML = `
    <span class="food-item-emoji">${emoji}</span>
    <span class="food-item-name">${food.name}</span>
    <span class="food-item-check">${checkMark}</span>
  `;

  item.addEventListener("click", () => selectFood(food.name));
  foodDropdownList.appendChild(item);
}

function selectFood(name) {
  selectedFood = name;
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
  renderFoodDropdown(ALL_FOODS);
  foodDropdown.classList.remove("hidden");
  foodSearchInput.focus();
});

// Remove selected tag
foodTagRemove.addEventListener("click", () => {
  selectedFood = null;
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
  showNutritionCard(corrected);
  showMetaForm(corrected);
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
    showSuccess(result);
  } catch (err) {
    showError(err.message);
    btnSave.disabled = false;
    btnSave.textContent = "💾 Save to Database";
  }
});

// ── Show success state ──────────────────────────────────────────────────
function showSuccess(result) {
  metaForm.classList.add("hidden");
  resultCard.classList.add("hidden");
  successState.classList.remove("hidden");
  successImageId.textContent = result.image_id;
  successLabel.textContent = capitalize(result.label);
  successTime.textContent = nowISO();
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
