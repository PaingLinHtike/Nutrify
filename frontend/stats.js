/* ═══════════════════════════════════════════
   Nutrify — Statistics
   ═══════════════════════════════════════════ */

(function () {
  var supabase = window.__supabase;
  if (!supabase) return;

  var statsChart = null;

  // Theme-aware Chart.js scales
  function chartTheme() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var tick = dark ? "#94a3b8" : "#6b7280";
    var grid = dark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)";
    return {
      scales: {
        y: { beginAtZero: true, ticks: { color: tick }, grid: { color: grid } },
        x: { ticks: { color: tick }, grid: { display: false } },
      },
    };
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  async function loadStats() {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;
    var userId = session.session.user.id;

    var { data: meals } = await supabase
      .from("meals")
      .select("logged_at, calories, food_name, meal_type")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true });

    var { data: summaries } = await supabase
      .from("daily_summaries")
      .select("date, total_calories, calorie_goal_met, total_water_ml")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    var mealsArr = meals || [];
    var sums = summaries || [];

    // Streak (consecutive days ending today or yesterday)
    var days = new Set();
    mealsArr.forEach(function (m) {
      days.add(m.logged_at.slice(0, 10));
    });
    var streak = 0;
    var d = new Date();
    if (!days.has(d.toISOString().slice(0, 10))) {
      d.setDate(d.getDate() - 1);
    }
    while (days.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    document.getElementById("statStreak").textContent = streak;

    // Total meals logged
    var mealsEl = document.getElementById("statMeals");
    if (mealsEl) mealsEl.textContent = mealsArr.length;

    // Average calories
    var totalCal = sums.reduce(function (a, s) {
      return a + (parseFloat(s.total_calories) || 0);
    }, 0);
    var avgCal = sums.length ? Math.round(totalCal / sums.length) : 0;
    document.getElementById("statAvgCal").textContent = avgCal;

    // Calorie goal met %
    var metCount = sums.filter(function (s) {
      return s.calorie_goal_met;
    }).length;
    var metPct = sums.length ? Math.round((metCount / sums.length) * 100) : 0;
    document.getElementById("statGoalMet").textContent = metPct + "%";

    // Most logged food
    var counts = {};
    mealsArr.forEach(function (m) {
      counts[m.food_name] = (counts[m.food_name] || 0) + 1;
    });
    var top = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    })[0];
    document.getElementById("statTopFood").textContent = top
      ? counts[top] + "× " + top
      : "—";

    // Total water drank
    var totalWater = sums.reduce(function (a, s) {
      return a + (parseFloat(s.total_water_ml) || 0);
    }, 0);
    var waterEl = document.getElementById("statWater");
    if (waterEl) waterEl.textContent = (totalWater / 1000).toFixed(1) + " L";

    // Meals by type
    var typeCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    mealsArr.forEach(function (m) {
      if (typeCounts[m.meal_type] !== undefined) typeCounts[m.meal_type]++;
    });
    var totalMeals = mealsArr.length || 1;
    [
      ["breakfast", "Breakfast"],
      ["lunch", "Lunch"],
      ["dinner", "Dinner"],
      ["snack", "Snack"],
    ].forEach(function (pair) {
      var t = pair[0];
      setText(t + "Count", typeCounts[t]);
      var bar = document.getElementById(t + "Bar");
      if (bar)
        bar.style.width = Math.round((typeCounts[t] / totalMeals) * 100) + "%";
    });

    renderSevenDayChart(sums);

    renderBadges(mealsArr, streak);
  }

  function renderSevenDayChart(summaries) {
    var ctx = document.getElementById("statsChart");
    if (!ctx || typeof Chart === "undefined") return;

    var byDate = {};
    summaries.forEach(function (s) {
      byDate[s.date] = parseFloat(s.total_calories) || 0;
    });

    var labels = [];
    var values = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var day = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString([], { weekday: "short" }));
      values.push(byDate[day] || 0);
    }

    if (statsChart) statsChart.destroy();
    statsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Calories",
            data: values,
            backgroundColor: "#06b6d4",
            borderRadius: 6,
          },
        ],
      },
      options: Object.assign(
        { responsive: true, maintainAspectRatio: false },
        chartTheme(),
        { plugins: { legend: { display: false } } },
      ),
    });
  }

  function renderBadges(meals, streak) {
    var el = document.getElementById("badges");
    if (!el) return;
    var badges = [];
    if (meals.length >= 1) badges.push({ icon: "🍽️", label: "First Meal" });
    if (meals.length >= 10)
      badges.push({ icon: "💪", label: "10 Meals Logged" });
    if (meals.length >= 100)
      badges.push({ icon: "🎖️", label: "100 Meals Logged" });
    if (streak >= 7) badges.push({ icon: "🔥", label: "7-Day Streak" });
    if (streak >= 30) badges.push({ icon: "🏆", label: "30-Day Streak" });

    if (badges.length === 0) {
      el.innerHTML = '<p class="meal-empty">Log meals to earn badges!</p>';
      return;
    }
    el.innerHTML = badges
      .map(function (b) {
        return (
          '<div class="badge"><span class="badge-icon">' +
          b.icon +
          "</span><span>" +
          b.label +
          "</span></div>"
        );
      })
      .join("");
  }

  window.addEventListener("hashchange", function () {
    if (window.location.hash.indexOf("statistics") !== -1) loadStats();
  });

  loadStats();
})();
