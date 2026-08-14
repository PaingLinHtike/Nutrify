/* ═══════════════════════════════════════════
   Nutrify — History (Daily / Weekly / Monthly)
   ═══════════════════════════════════════════ */

(function () {
  var supabase = window.__supabase;
  if (!supabase) return;

  var tabs = document.getElementById("historyTabs");
  var dailyPanel = document.getElementById("historyDailyPanel");
  var chartPanel = document.getElementById("historyChartPanel");
  var dateEl = document.getElementById("historyDate");
  var mealList = document.getElementById("historyMealList");

  if (!tabs || !dailyPanel) return;

  var currentRange = "day";
  var chart = null;

  // Theme-aware Chart.js scales + legend colors
  function chartTheme() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var tick = dark ? "#94a3b8" : "#6b7280";
    var grid = dark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)";
    return {
      scales: {
        y: { beginAtZero: true, ticks: { color: tick }, grid: { color: grid } },
        x: { ticks: { color: tick }, grid: { display: false } },
      },
      plugins: { legend: { labels: { color: tick } } },
    };
  }

  function isoDay(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return d.toISOString().slice(0, 10);
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  async function loadDay(offset) {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;

    var day = isoDay(offset);
    var { data: meals } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", session.session.user.id)
      .gte("logged_at", day + "T00:00:00")
      .lte("logged_at", day + "T23:59:59")
      .order("logged_at", { ascending: false });

    dateEl.textContent =
      offset === 0
        ? "Today"
        : new Date(day + "T00:00:00").toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

    // Day summary totals
    var cal = 0,
      pro = 0,
      car = 0,
      fat = 0;
    (meals || []).forEach(function (m) {
      cal += parseFloat(m.calories) || 0;
      pro += parseFloat(m.protein_g) || 0;
      car += parseFloat(m.carbs_g) || 0;
      fat += parseFloat(m.fat_g) || 0;
    });
    setText("daySumCal", Math.round(cal) + " kcal");
    setText("daySumPro", pro.toFixed(1) + " g");
    setText("daySumCar", car.toFixed(1) + " g");
    setText("daySumFat", fat.toFixed(1) + " g");
    setText("daySumCount", (meals || []).length);

    if (!meals || meals.length === 0) {
      mealList.innerHTML =
        '<p class="meal-empty">No meals logged for this day.</p>';
      return;
    }

    var icons = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍿" };
    mealList.innerHTML = meals
      .map(function (m) {
        var t = new Date(m.logged_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          '<div class="meal-item">' +
          '<span class="meal-item-icon">' +
          (icons[m.meal_type] || "🍽️") +
          "</span>" +
          '<span class="meal-item-name">' +
          m.food_name +
          "</span>" +
          '<span class="meal-item-cals">' +
          parseFloat(m.calories).toFixed(0) +
          " kcal</span>" +
          '<span class="meal-item-time">' +
          t +
          "</span>" +
          '<span class="meal-item-type">' +
          m.meal_type +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  async function loadRange(range) {
    var { data: session } = await supabase.auth.getSession();
    if (!session || !session.session) return;

    var days = range === "week" ? 7 : 30;
    var start = isoDay(-(days - 1));
    var { data: summaries } = await supabase
      .from("daily_summaries")
      .select("date, total_calories")
      .eq("user_id", session.session.user.id)
      .gte("date", start)
      .order("date", { ascending: true });

    var byDate = {};
    (summaries || []).forEach(function (s) {
      byDate[s.date] = parseFloat(s.total_calories) || 0;
    });

    var labels = [];
    var values = [];
    for (var i = 0; i < days; i++) {
      var day = isoDay(-(days - 1 - i));
      var d = new Date(day + "T00:00:00");
      labels.push(
        range === "week"
          ? d.toLocaleDateString([], { weekday: "short" })
          : d.toLocaleDateString([], { month: "short", day: "numeric" }),
      );
      values.push(byDate[day] || 0);
    }

    // Chart summary stats
    var total = values.reduce(function (a, v) {
      return a + v;
    }, 0);
    var avg = days ? Math.round(total / days) : 0;
    var best = values.length ? Math.max.apply(null, values) : 0;
    setText("chartAvg", avg + " kcal");
    setText("chartBest", best + " kcal");
    setText("chartTotal", Math.round(total) + " kcal");

    var ctx = document.getElementById("historyChart");
    if (!ctx) return;
    if (chart) chart.destroy();
    if (typeof Chart === "undefined") return;

    chart = new Chart(ctx, {
      type: range === "week" ? "bar" : "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Calories",
            data: values,
            backgroundColor: "#2563eb",
            borderColor: "#2563eb",
            borderRadius: 6,
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: Object.assign(
        { responsive: true, maintainAspectRatio: false },
        chartTheme(),
      ),
    });
  }

  function setRange(range) {
    currentRange = range;
    tabs.querySelectorAll(".seg-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-range") === range);
    });
    if (range === "day") {
      dailyPanel.classList.remove("hidden");
      chartPanel.classList.add("hidden");
      loadDay(0);
    } else {
      dailyPanel.classList.add("hidden");
      chartPanel.classList.remove("hidden");
      loadRange(range);
    }
  }

  tabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".seg-btn");
    if (btn) setRange(btn.getAttribute("data-range"));
  });

  // Re-render when the history view becomes active
  window.addEventListener("hashchange", function () {
    if (window.location.hash.indexOf("history") !== -1) setRange(currentRange);
  });

  setRange("day");
})();
