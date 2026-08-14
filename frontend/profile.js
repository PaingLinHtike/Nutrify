/* ═══════════════════════════════════════════
   Nutrify — Profile (view + edit)
   ═══════════════════════════════════════════ */

(function () {
  var supabase = window.__supabase;
  if (!supabase) return;

  var form = document.getElementById("profileForm");
  var note = document.getElementById("profileNote");
  if (!form) return;

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v === null || v === undefined ? "" : v;
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v || "";
  }

  // ── View / Edit mode toggle ──
  function setEditMode(editing) {
    form.querySelectorAll("input, select").forEach(function (el) {
      el.disabled = !editing;
    });
    form.classList.toggle("viewing", !editing);
    var saveBtn = document.getElementById("btnProfileSave");
    if (saveBtn) saveBtn.classList.toggle("hidden", !editing);
    var editBtn = document.getElementById("btnEditProfile");
    if (editBtn) editBtn.textContent = editing ? "✕ Close" : "✏️ Edit";
  }

  async function loadProfile() {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;
    var userId = session.session.user.id;
    var { data: p } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setText("pfHeaderEmail", session.session.user.email || "");
    if (!p) return;

    setText("pfHeaderName", p.full_name || "Nutrify User");
    setVal("pfName", p.full_name);
    setVal("pfGender", p.gender);
    setVal("pfBirth", p.birth_date);
    setVal("pfHeight", p.height_cm);
    setVal("pfWeight", p.weight_kg);
    setVal("pfActivity", p.activity_level);
    setVal("pfGoal", p.diet_goal);
    setVal("pfDiet", p.diet_type);
    setVal("pfCal", p.goal_calories);
    setVal("pfProtein", p.goal_protein);
    setVal("pfCarbs", p.goal_carbs);
    setVal("pfFat", p.goal_fat);
    setVal("pfWater", p.goal_water_ml);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;
    var userId = session.session.user.id;

    var payload = {
      id: userId,
      full_name: document.getElementById("pfName").value.trim() || null,
      gender: document.getElementById("pfGender").value || null,
      birth_date: document.getElementById("pfBirth").value || null,
      height_cm: parseFloat(document.getElementById("pfHeight").value) || null,
      weight_kg: parseFloat(document.getElementById("pfWeight").value) || null,
      activity_level: document.getElementById("pfActivity").value,
      diet_goal: document.getElementById("pfGoal").value,
      diet_type: document.getElementById("pfDiet").value,
      goal_calories: parseInt(document.getElementById("pfCal").value) || 2000,
      goal_protein: parseFloat(document.getElementById("pfProtein").value) || 0,
      goal_carbs: parseFloat(document.getElementById("pfCarbs").value) || 0,
      goal_fat: parseFloat(document.getElementById("pfFat").value) || 0,
      goal_water_ml: parseInt(document.getElementById("pfWater").value) || 3000,
    };

    var { error } = await supabase.from("user_profiles").upsert(payload);
    if (error) {
      note.textContent = "❌ Failed: " + error.message;
    } else {
      note.textContent = "✅ Profile saved!";
      setText(
        "pfHeaderName",
        document.getElementById("pfName").value.trim() || "Nutrify User",
      );
      if (window.refreshTrackerPublic) window.refreshTrackerPublic();
      setEditMode(false);
      setTimeout(function () {
        note.textContent = "";
      }, 3000);
    }
  });

  // ── Edit button toggles view / edit mode ──
  var editBtn = document.getElementById("btnEditProfile");
  if (editBtn) {
    editBtn.addEventListener("click", function () {
      var editing = form.classList.contains("viewing");
      if (editing) {
        setEditMode(true);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        var nameEl = document.getElementById("pfName");
        if (nameEl) nameEl.focus();
      } else {
        setEditMode(false);
        loadProfile();
      }
    });
  }

  window.addEventListener("hashchange", function () {
    if (window.location.hash.indexOf("profile") !== -1) loadProfile();
  });

  loadProfile();
  setEditMode(false); // start in view-only mode
})();
