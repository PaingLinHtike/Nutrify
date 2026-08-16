/* ═══════════════════════════════════════════
   Nutrify — Meal Logging (#7) + Daily Tracker (#8)
   ═══════════════════════════════════════════ */

(function () {
  var supabase = window.__supabase;
  if (!supabase) {
    console.warn("Supabase not ready");
    return;
  }

  // ── DOM refs ──
  var saveMeal = document.getElementById("saveMeal");
  var btnSaveMeal = document.getElementById("btnSaveMeal");
  var mealType = document.getElementById("mealType");
  var servingSize = document.getElementById("servingSize");
  var saveMealNote = document.getElementById("saveMealNote");

  // ── Show Save Meal when nutrition card becomes visible ──
  // Use lightweight polling instead of MutationObserver (which can cause freezes)
  var wasNutritionVisible = false;
  setInterval(function () {
    var nc = document.getElementById("nutritionCard");
    var isVisible = nc && !nc.classList.contains("hidden");
    if (isVisible && !wasNutritionVisible) {
      if (saveMeal) saveMeal.classList.remove("hidden");
    }
    wasNutritionVisible = isVisible;
  }, 300);

  // ── Hide Save Meal when user starts a new upload (watches upload preview) ──
  var uploadPreview = document.getElementById("uploadPreview");
  if (uploadPreview) {
    new MutationObserver(function () {
      if (!uploadPreview.classList.contains("hidden") && saveMeal) {
        saveMeal.classList.add("hidden");
      }
    }).observe(uploadPreview, { attributes: true, attributeFilter: ["class"] });
  }
  if (btnSaveMeal) {
    btnSaveMeal.addEventListener("click", async function () {
      var foodEl = document.getElementById("resultFood");
      var calEl = document.getElementById("nCalories");
      var proEl = document.getElementById("nProtein");
      var fatEl = document.getElementById("nFat");
      var carbEl = document.getElementById("nCarbs");
      if (!foodEl || !calEl) return;

      var foodName = foodEl.textContent.trim();
      var servingG = parseFloat(servingSize.value);
      if (!Number.isFinite(servingG) || servingG < 1 || servingG > 2000) {
        saveMealNote.textContent = "Enter a weight between 1 g and 2000 g.";
        return;
      }

      // Nutrition values are already scaled live by app.js for this serving.
      var calories = parseFloat(calEl.textContent) || 0;
      var protein = parseFloat(proEl.textContent) || 0;
      var fat = parseFloat(fatEl.textContent) || 0;
      var carbs = parseFloat(carbEl.textContent) || 0;

      btnSaveMeal.disabled = true;
      btnSaveMeal.textContent = "Saving...";
      saveMealNote.textContent = "";

      var { data: session } = await supabase.auth.getSession();
      if (!session || !session.session) {
        saveMealNote.textContent = "Please sign in first.";
        btnSaveMeal.disabled = false;
        btnSaveMeal.textContent = "💾 Save Meal";
        return;
      }

      var { error } = await supabase.from("meals").insert({
        user_id: session.session.user.id,
        meal_type: mealType.value,
        food_name: foodName,
        serving_size_g: servingG,
        calories: parseFloat(calories.toFixed(1)),
        protein_g: parseFloat(protein.toFixed(1)),
        fat_g: parseFloat(fat.toFixed(1)),
        carbs_g: parseFloat(carbs.toFixed(1)),
      });

      if (error) {
        saveMealNote.textContent = "❌ Failed: " + error.message;
      } else {
        saveMealNote.textContent =
          "✅ " +
          foodName +
          " saved to " +
          mealType.options[mealType.selectedIndex].text +
          "!";
        refreshTracker();
        loadTodayMeals();
        showMealSuccess(foodName);
      }

      btnSaveMeal.disabled = false;
      btnSaveMeal.textContent = "💾 Save Meal";
    });
  }

  // ── Water intake ──
  window.addWater = async function (ml) {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;
    await supabase.from("water_logs").insert({
      user_id: session.session.user.id,
      amount_ml: ml,
    });
    refreshTracker();
  };

  // ── Show success screen after saving a meal ──
  function showMealSuccess(foodName) {
    var successState = document.getElementById("successState");
    var successMsg = document.querySelector(".success-message");
    if (!successState || !successMsg) return;
    successMsg.textContent = foodName + " was logged to your daily tracker!";
    var resultCard = document.getElementById("resultCard");
    var nutritionCard = document.getElementById("nutritionCard");
    if (resultCard) resultCard.classList.add("hidden");
    if (nutritionCard) nutritionCard.classList.add("hidden");
    if (saveMeal) saveMeal.classList.add("hidden");
    successState.classList.remove("hidden");
    successState.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ── Refresh daily tracker ──
  async function refreshTracker() {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;

    var today = new Date().toISOString().slice(0, 10);

    // Get today's meals
    var { data: meals } = await supabase
      .from("meals")
      .select("calories, protein_g, fat_g, carbs_g")
      .eq("user_id", session.session.user.id)
      .gte("logged_at", today + "T00:00:00")
      .lte("logged_at", today + "T23:59:59");

    var totalCal = 0,
      totalPro = 0,
      totalFat = 0,
      totalCarbs = 0;
    if (meals) {
      meals.forEach(function (m) {
        totalCal += parseFloat(m.calories) || 0;
        totalPro += parseFloat(m.protein_g) || 0;
        totalFat += parseFloat(m.fat_g) || 0;
        totalCarbs += parseFloat(m.carbs_g) || 0;
      });
    }

    // Get today's water
    var { data: waters } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", session.session.user.id)
      .gte("logged_at", today + "T00:00:00")
      .lte("logged_at", today + "T23:59:59");

    var totalWater = 0;
    if (waters)
      waters.forEach(function (w) {
        totalWater += w.amount_ml;
      });

    // Get goals
    var { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "goal_calories, goal_protein, goal_carbs, goal_fat, goal_water_ml",
      )
      .eq("id", session.session.user.id)
      .single();

    var goalCal =
      profile && profile.goal_calories ? profile.goal_calories : 2000;
    var goalPro =
      profile && profile.goal_protein ? parseFloat(profile.goal_protein) : 120;
    var goalCarbs =
      profile && profile.goal_carbs ? parseFloat(profile.goal_carbs) : 250;
    var goalFat =
      profile && profile.goal_fat ? parseFloat(profile.goal_fat) : 65;
    var goalWater =
      profile && profile.goal_water_ml ? profile.goal_water_ml : 3000;

    // Update UI
    setCalorieRing(totalCal, goalCal);
    setTracker("pro", totalPro, goalPro, "g");
    setTracker("car", totalCarbs, goalCarbs, "g");
    setTracker("fat", totalFat, goalFat, "g");
    setTracker("wat", totalWater / 1000, goalWater / 1000, "L", 1);
    renderWaterDrops(totalWater, goalWater);

    // Sidebar mini summary (fills the nav bar's empty space)
    var sideCal = document.getElementById("sideCal");
    if (sideCal)
      sideCal.textContent =
        Math.round(totalCal) + " / " + Math.round(goalCal) + " kcal";
    var sideWater = document.getElementById("sideWater");
    if (sideWater)
      sideWater.textContent = (totalWater / 1000).toFixed(1) + " L";
    var sideMeals = document.getElementById("sideMeals");
    if (sideMeals) sideMeals.textContent = meals ? meals.length : 0;

    // Upsert daily summary
    var calPct = goalCal > 0 ? (totalCal / goalCal) * 100 : 0;
    var proPct = goalPro > 0 ? (totalPro / goalPro) * 100 : 0;
    var watPct = goalWater > 0 ? (totalWater / goalWater) * 100 : 0;

    await supabase.from("daily_summaries").upsert(
      {
        user_id: session.session.user.id,
        date: today,
        total_calories: parseFloat(totalCal.toFixed(1)),
        total_protein_g: parseFloat(totalPro.toFixed(1)),
        total_fat_g: parseFloat(totalFat.toFixed(1)),
        total_carbs_g: parseFloat(totalCarbs.toFixed(1)),
        total_water_ml: totalWater,
        meal_count: meals ? meals.length : 0,
        calorie_goal_met: calPct >= 90,
        protein_goal_met: proPct >= 90,
        water_goal_met: watPct >= 90,
      },
      { onConflict: "user_id, date" },
    );
  }

  function setTracker(prefix, current, goal, unit, decimals) {
    decimals = decimals || 0;
    var curEl = document.getElementById(prefix + "Current");
    var goalEl = document.getElementById(prefix + "Goal");
    var barEl = document.getElementById(prefix + "Bar");
    if (curEl) curEl.textContent = current.toFixed(decimals);
    if (goalEl) goalEl.textContent = goal.toFixed(decimals);
    var pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    if (barEl) barEl.style.width = pct + "%";

    // Percent label (e.g., #proPct, #watPct)
    var pctEl = document.getElementById(prefix + "Pct");
    if (pctEl) pctEl.textContent = Math.round(pct) + "%";

    // Mirror into the dash boxes + progress detail view
    var names = { pro: "Pro", car: "Car", fat: "Fat", wat: "Wat" };
    var key = names[prefix];
    if (key) {
      ["dash", "pg"].forEach(function (t) {
        var dCur = document.getElementById(t + key + "Current");
        var dGoal = document.getElementById(t + key + "Goal");
        var dPct = document.getElementById(t + key + "Pct");
        if (dCur) dCur.textContent = current.toFixed(decimals);
        if (dGoal) dGoal.textContent = goal.toFixed(decimals);
        if (dPct) dPct.textContent = Math.round(pct) + "%";
      });
      var pgBar = document.getElementById("pg" + key + "Bar");
      if (pgBar) pgBar.style.width = pct + "%";
    }
  }

  // ── Update the circular calorie ring ──
  function setCalorieRing(current, goal) {
    var curEl = document.getElementById("calCurrent");
    var goalEl = document.getElementById("calGoal");
    var ringEl = document.getElementById("calRing");
    var pct = goal > 0 ? Math.min(current / goal, 1) : 0;
    if (curEl) curEl.textContent = Math.round(current);
    if (goalEl) goalEl.textContent = Math.round(goal);
    if (ringEl) {
      var r = 60;
      var c = 2 * Math.PI * r;
      ringEl.style.strokeDasharray = c;
      ringEl.style.strokeDashoffset = c * (1 - pct);
    }

    // Percent inside the ring
    var pctEl = document.getElementById("calPct");
    if (pctEl) pctEl.textContent = Math.round(pct * 100) + "%";

    // Mirror into the Calories dash box
    var dCur = document.getElementById("dashCalCurrent");
    var dGoal = document.getElementById("dashCalGoal");
    var dPct = document.getElementById("dashCalPct");
    if (dCur) dCur.textContent = Math.round(current);
    if (dGoal) dGoal.textContent = Math.round(goal);
    if (dPct) dPct.textContent = Math.round(pct * 100) + "%";

    // Mirror into the progress detail view
    var pCur = document.getElementById("pgCalCurrent");
    var pGoal = document.getElementById("pgCalGoal");
    var pPct = document.getElementById("pgCalPct");
    if (pCur) pCur.textContent = Math.round(current);
    if (pGoal) pGoal.textContent = Math.round(goal);
    if (pPct) pPct.textContent = Math.round(pct * 100) + "%";
  }

  // ── Render hydration water drops (250ml per drop) ──
  function renderWaterDrops(current, goal) {
    ["pgWaterDrops", "dashWaterDrops"].forEach(function (targetId) {
      var wrap = document.getElementById(targetId);
      if (!wrap) return;
      var perDrop = 250;
      var totalDrops = Math.max(1, Math.ceil(goal / perDrop));
      var filled = Math.min(totalDrops, Math.floor(current / perDrop));
      var html = "";
      for (var i = 0; i < totalDrops; i++) {
        html +=
          '<button class="water-drop' +
          (i < filled ? " filled" : "") +
          '" onclick="addWater(250)" title="+250ml">💧</button>';
      }
      wrap.innerHTML = html;
    });
  }

  // ── Load today's meals ──
  async function loadTodayMeals() {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;

    var today = new Date().toISOString().slice(0, 10);
    var { data: meals } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", session.session.user.id)
      .gte("logged_at", today + "T00:00:00")
      .lte("logged_at", today + "T23:59:59")
      .order("logged_at", { ascending: false });

    var mealList = document.getElementById("mealList");
    var pgMealList = document.getElementById("pgMealList");

    var html;
    if (!meals || meals.length === 0) {
      html =
        '<p class="meal-empty">No meals logged yet. Upload a food photo to get started!</p>';
    } else {
      var typeIcons = {
        breakfast: "🌅",
        lunch: "☀️",
        dinner: "🌙",
        snack: "🍿",
      };
      html = meals
        .map(function (m) {
          var icon = typeIcons[m.meal_type] || "🍽️";
          var time = new Date(m.logged_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            '<div class="meal-item">' +
            '<span class="meal-item-icon">' +
            icon +
            "</span>" +
            '<span class="meal-item-name">' +
            m.food_name +
            "</span>" +
            '<span class="meal-item-cals">' +
            parseFloat(m.calories).toFixed(0) +
            " kcal</span>" +
            '<span class="meal-item-time">' +
            time +
            "</span>" +
            '<span class="meal-item-type">' +
            m.meal_type +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    if (mealList) mealList.innerHTML = html;
    if (pgMealList) pgMealList.innerHTML = html;
  }

  // ── Initialize on load ──
  refreshTracker();
  loadTodayMeals();

  // ── Greeting (time of day + date) ──
  (function () {
    var el = document.getElementById("greetingText");
    if (!el) return;
    var h = new Date().getHours();
    el.textContent =
      h < 12
        ? "Good Morning! ☀️"
        : h < 18
          ? "Good Afternoon! 🌤️"
          : "Good Evening! 🌙";
    var dEl = document.getElementById("greetingDate");
    if (dEl)
      dEl.textContent = new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
  })();

  // ── Refresh when the progress detail view is opened ──
  window.addEventListener("hashchange", function () {
    if (window.location.hash.indexOf("progress") !== -1) {
      refreshTracker();
      loadTodayMeals();
    }
  });

  // Expose for onboarding/profile to refresh after goal changes
  window.refreshTrackerPublic = refreshTracker;
  window.loadTodayMealsPublic = loadTodayMeals;
})();
