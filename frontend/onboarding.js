/* ═══════════════════════════════════════════
   Nutrify — Onboarding (3-step)
   ═══════════════════════════════════════════ */

(function () {
  var supabase = window.__supabase;
  if (!supabase) return;

  var overlay = document.getElementById("onboardingOverlay");
  var backBtn = document.getElementById("onbBack");
  var nextBtn = document.getElementById("onbNext");
  var steps = document.querySelectorAll(".onb-step");
  var dots = document.querySelectorAll(".onb-dot");
  var goalCards = document.querySelectorAll(".goal-card");

  if (!overlay || !nextBtn) return;

  var currentStep = 1;
  var selectedGoal = "maintain";

  function showStep(n) {
    currentStep = n;
    steps.forEach(function (s) {
      s.classList.toggle("active", parseInt(s.getAttribute("data-step")) === n);
    });
    dots.forEach(function (d, i) {
      d.classList.toggle("active", i < n);
    });
    backBtn.classList.toggle("hidden", n === 1);
    nextBtn.textContent = n === 3 ? "Finish ✓" : "Next →";
  }

  backBtn.addEventListener("click", function () {
    if (currentStep > 1) showStep(currentStep - 1);
  });

  nextBtn.addEventListener("click", function () {
    if (currentStep < 3) {
      showStep(currentStep + 1);
      return;
    }
    saveProfile();
  });

  goalCards.forEach(function (c) {
    c.addEventListener("click", function () {
      goalCards.forEach(function (g) {
        g.classList.remove("selected");
      });
      c.classList.add("selected");
      selectedGoal = c.getAttribute("data-goal");
    });
  });

  function ageFrom(birth) {
    if (!birth) return 30;
    var d = new Date(birth);
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age > 0 ? age : 30;
  }

  function computeGoals(gender, birth, height, weight, activity, goal) {
    var age = ageFrom(birth);
    var bmr =
      gender === "female"
        ? 10 * weight + 6.25 * height - 5 * age - 161
        : 10 * weight + 6.25 * height - 5 * age + 5;
    var factors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    var tdee = bmr * (factors[activity] || 1.375);
    var adjust =
      goal === "lose_weight" ? -500 : goal === "gain_muscle" ? 300 : 0;
    var cal = Math.max(1200, Math.round(tdee + adjust));
    var protein = Math.round(weight * (goal === "gain_muscle" ? 2.0 : 1.6));
    var fat = Math.round((cal * 0.25) / 9);
    var carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
    var water = Math.max(2000, Math.round(weight * 35));
    return { cal: cal, protein: protein, fat: fat, carbs: carbs, water: water };
  }

  async function saveProfile() {
    var height = parseFloat(document.getElementById("onbHeight").value);
    var weight = parseFloat(document.getElementById("onbWeight").value);
    if (!height || !weight) {
      alert("Please enter your height and weight.");
      return;
    }

    var gender = document.getElementById("onbGender").value;
    var birth = document.getElementById("onbBirth").value || null;
    var activity = document.getElementById("onbActivity").value;
    var diet = document.getElementById("onbDiet").value;
    var g = computeGoals(gender, birth, height, weight, activity, selectedGoal);

    nextBtn.disabled = true;
    nextBtn.textContent = "Saving...";

    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;
    var userId = session.session.user.id;

    var { error } = await supabase.from("user_profiles").upsert({
      id: userId,
      gender: gender,
      birth_date: birth,
      height_cm: height,
      weight_kg: weight,
      activity_level: activity,
      diet_type: diet,
      diet_goal: selectedGoal,
      goal_calories: g.cal,
      goal_protein: g.protein,
      goal_carbs: g.carbs,
      goal_fat: g.fat,
      goal_water_ml: g.water,
    });

    if (error) {
      alert("Failed to save profile: " + error.message);
      nextBtn.disabled = false;
      nextBtn.textContent = "Finish ✓";
      return;
    }

    overlay.classList.add("hidden");
    if (window.showView) window.showView("dashboard");
    if (window.refreshTrackerPublic) window.refreshTrackerPublic();
  }

  // ── Show onboarding on load if profile is incomplete ──
  (async function init() {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;
    var userId = session.session.user.id;
    var { data: profile } = await supabase
      .from("user_profiles")
      .select("height_cm, weight_kg")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || !profile.height_cm || !profile.weight_kg) {
      overlay.classList.remove("hidden");
      showStep(1);
    }
  })();
})();
