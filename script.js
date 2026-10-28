// One source of truth for food and activity calories.
// Every calorieData item has exactly two properties: name and calories.
// Positive calories = food consumed; negative calories = calories burned.
// Activity durations are persisted in a separate object, indexed by the item's
// position, so duration does not add a third property to calorieData items.

const STORAGE_KEY = "workoutTrackerState.v1";

function getDefaultCalorieData() {
  return [
    { name: "Breakfast: Oatmeal & fruit", calories: 210 },
    { name: "Lunch: Brazilian Stew", calories: 123 },
    { name: "Dinner: Brazilian Stew", calories: 120 },
    { name: "Snack: Apple & almonds", calories: 95 },
    { name: "Morning Walk", calories: -120 },
    { name: "Gym", calories: -150 },
    { name: "Cycling", calories: -100 },
    { name: "Running", calories: -80 },
  ];
}

const DEFAULT_DURATIONS_BY_NAME = {
  "Morning Walk": 25,
  Gym: 35,
  Cycling: 30,
  Running: 15,
};

function normalizeCalorieData(items) {
  if (!Array.isArray(items)) return getDefaultCalorieData();

  return items
    .filter((item) =>
      item &&
      typeof item.name === "string" &&
      item.name.trim() &&
      Number.isFinite(Number(item.calories))
    )
    .map((item) => ({
      name: item.name.trim(),
      calories: Number(item.calories),
    }));
}

function getDefaultDurations(items) {
  const durations = {};
  items.forEach((item, index) => {
    if (item.calories < 0) {
      durations[index] = DEFAULT_DURATIONS_BY_NAME[item.name] || 30;
    }
  });
  return durations;
}

function loadWorkoutState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.calorieData)) {
        const items = normalizeCalorieData(parsed.calorieData);
        const savedDurations = parsed.activityDurations &&
          typeof parsed.activityDurations === "object" &&
          !Array.isArray(parsed.activityDurations)
          ? parsed.activityDurations
          : {};
        const durations = {};

        items.forEach((item, index) => {
          if (item.calories < 0) {
            const duration = Number(savedDurations[index]);
            durations[index] = Number.isFinite(duration) && duration > 0
              ? Math.round(duration)
              : (DEFAULT_DURATIONS_BY_NAME[item.name] || 30);
          }
        });

        return { calorieData: items, activityDurations: durations };
      }
    }
  } catch (error) {
    console.warn("Could not read Workout Tracker data from localStorage.", error);
  }

  const items = getDefaultCalorieData();
  return { calorieData: items, activityDurations: getDefaultDurations(items) };
}

let { calorieData, activityDurations } = loadWorkoutState();

const formatNumber = (value) => Math.round(value).toLocaleString("en-US");

function getMealIcon(mealType) {
  switch (mealType) {
    case "Breakfast": return "🥣";
    case "Lunch": return "🍲";
    case "Dinner": return "🌭";
    case "Snack": return "🍎";
    default: return "🍽️";
  }
}

function getActivityIcon(name) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("walk")) return "🚶";
  if (normalizedName.includes("run")) return "🏃";
  if (normalizedName.includes("cycl") || normalizedName.includes("bik")) return "🚴";
  if (normalizedName.includes("swim")) return "🏊";
  if (normalizedName.includes("yoga")) return "🧘";
  if (normalizedName.includes("gym") || normalizedName.includes("weight") || normalizedName.includes("strength")) return "🏋️";
  return "💪";
}

function getActivityDescription(name, duration) {
  const normalizedName = name.toLowerCase();
  let activityType = "Workout activity";
  if (normalizedName.includes("walk")) activityType = "Outdoor walk";
  else if (normalizedName.includes("run")) activityType = "Cardio session";
  else if (normalizedName.includes("cycl") || normalizedName.includes("bik")) activityType = "Outdoor cycling";
  else if (normalizedName.includes("swim")) activityType = "Swimming";
  else if (normalizedName.includes("yoga")) activityType = "Flexibility & balance";
  else if (normalizedName.includes("gym") || normalizedName.includes("weight") || normalizedName.includes("strength")) activityType = "Strength training";
  return `${activityType} · ${duration} min`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function saveWorkoutState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ calorieData, activityDurations }));
    return true;
  } catch (error) {
    console.error("Could not save Workout Tracker data to localStorage.", error);
    return false;
  }
}

function renderMeals() {
  const mealList = document.getElementById("meal-list");
  const meals = calorieData.filter((item) => item.calories > 0);

  mealList.innerHTML = meals.map((item, index) => {
    const [mealTypeRaw, ...descriptionParts] = item.name.split(":");
    const mealType = mealTypeRaw.trim();
    const description = descriptionParts.join(":").trim() || mealType;
    const rowBackground = index % 2 === 0 ? "bg-[#f3f3f5]" : "";
    const rowBorder = index < meals.length - 1 ? "border-b border-black/5" : "";

    return `
      <div class="meal-entry flex items-center justify-between ${rowBorder} ${rowBackground} px-5 py-5 sm:px-6">
        <div class="flex min-w-0 items-center gap-4">
          <span class="text-3xl" aria-hidden="true">${getMealIcon(mealType)}</span>
          <div class="min-w-0">
            <p class="text-sm text-[#858691]">${escapeHtml(description)}</p>
            <h3 class="text-lg font-semibold">${escapeHtml(mealType)}</h3>
          </div>
        </div>
        <p class="shrink-0 text-sm font-semibold">Cal-${formatNumber(item.calories)} kcal</p>
      </div>`;
  }).join("");
}

function renderActivities() {
  const activityList = document.getElementById("activity-list");
  const activities = calorieData
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.calories < 0);

  if (activities.length === 0) {
    activityList.innerHTML = `
      <div class="activity-empty-state">
        <span aria-hidden="true">🏃</span>
        <p>No activities yet</p>
        <small>Use the + button above to add your first workout.</small>
      </div>`;
    return;
  }

  activityList.innerHTML = activities.map(({ item, index }, activityIndex) => {
    const duration = Number(activityDurations[index]) || DEFAULT_DURATIONS_BY_NAME[item.name] || 30;
    const rowBackground = activityIndex % 2 === 0 ? "bg-[#f3f3f5]" : "";
    const rowBorder = activityIndex < activities.length - 1 ? "border-b border-black/5" : "";

    return `
      <div class="activity-entry flex min-h-[125px] flex-1 items-center justify-between gap-3 ${rowBorder} ${rowBackground} px-5 py-5 sm:px-6">
        <div class="activity-entry-main flex min-w-0 flex-1 items-center gap-3">
          <span class="text-3xl" aria-hidden="true">${getActivityIcon(item.name)}</span>
          <div class="min-w-0">
            <p class="text-sm text-[#858691]">${escapeHtml(getActivityDescription(item.name, duration))}</p>
            <h2 class="text-lg font-semibold">${escapeHtml(item.name)}</h2>
          </div>
        </div>
        <div class="activity-entry-actions">
          <p class="activity-calories shrink-0 text-sm font-semibold text-[#4962f4]">${formatNumber(Math.abs(item.calories))} kcal</p>
          <button
            class="delete-activity-button"
            type="button"
            data-delete-index="${index}"
            aria-label="Delete ${escapeHtml(item.name)}"
            title="Delete activity"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 10v6M14 10v6" />
            </svg>
          </button>
        </div>
      </div>`;
  }).join("");
}

function updateLatestActivity() {
  const activities = calorieData
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.calories < 0);
  const latest = activities[activities.length - 1];

  document.getElementById("latest-activity-icon").textContent = latest
    ? getActivityIcon(latest.item.name)
    : "🏃";
  document.getElementById("latest-activity-name").textContent = latest
    ? latest.item.name
    : "No activity yet";
  document.getElementById("latest-activity-description").textContent = latest
    ? getActivityDescription(latest.item.name, Number(activityDurations[latest.index]) || DEFAULT_DURATIONS_BY_NAME[latest.item.name] || 30)
    : "No activity recorded";
  document.getElementById("latest-activity-calories").textContent = latest
    ? formatNumber(Math.abs(latest.item.calories))
    : "0";
}

function updateCalorieSummary() {
  const caloriesConsumed = calorieData
    .filter((item) => item.calories > 0)
    .reduce((total, item) => total + item.calories, 0);

  const caloriesBurned = calorieData
    .filter((item) => item.calories < 0)
    .reduce((total, item) => total + Math.abs(item.calories), 0);

  const netBalance = calorieData.reduce((total, item) => total + item.calories, 0);
  const balanceSign = netBalance > 0 ? "+" : netBalance < 0 ? "−" : "";
  const dailySign = netBalance > 0 ? "+" : netBalance < 0 ? "−" : "=";
  const status = netBalance > 0 ? "Surplus" : netBalance < 0 ? "Deficit" : "Balanced";

  document.getElementById("burned-calories-value").textContent = `−${formatNumber(caloriesBurned)} kcal`;
  document.getElementById("consumed-calories-value").textContent = `+${formatNumber(caloriesConsumed)} kcal`;

  const balanceValue = document.getElementById("calorie-balance-value");
  balanceValue.textContent = `${balanceSign}${formatNumber(Math.abs(netBalance))} kcal`;
  balanceValue.style.color = netBalance > 0 ? "#6ee7b7" : netBalance < 0 ? "#fda4af" : "#ffffff";

  const signSymbol = document.getElementById("daily-sign-symbol");
  signSymbol.textContent = dailySign;
  signSymbol.style.color = netBalance > 0 ? "#6ee7b7" : netBalance < 0 ? "#fda4af" : "#ffffff";
  document.getElementById("daily-status").textContent = status;
}

function renderAll() {
  renderMeals();
  renderActivities();
  updateLatestActivity();
  updateCalorieSummary();
}

function openActivityModal() {
  const modal = document.getElementById("activity-modal");
  const form = document.getElementById("activity-form");
  const error = document.getElementById("activity-form-error");
  form.reset();
  error.hidden = true;
  error.textContent = "";
  modal.showModal();
  document.getElementById("activity-name").focus();
}

function closeActivityModal() {
  document.getElementById("activity-modal").close();
}

function handleAddActivity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const nameInput = document.getElementById("activity-name");
  const durationInput = document.getElementById("activity-duration");
  const caloriesInput = document.getElementById("activity-calories");
  const error = document.getElementById("activity-form-error");

  const name = nameInput.value.trim();
  const duration = Number(durationInput.value);
  const caloriesBurned = Number(caloriesInput.value);

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (!name) {
    error.textContent = "Please enter an activity name.";
    error.hidden = false;
    nameInput.focus();
    return;
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
    error.textContent = "Duration must be a whole number between 1 and 1440 minutes.";
    error.hidden = false;
    durationInput.focus();
    return;
  }
  if (!Number.isFinite(caloriesBurned) || !Number.isInteger(caloriesBurned) || caloriesBurned < 1 || caloriesBurned > 10000) {
    error.textContent = "Calories burned must be a whole number between 1 and 10,000.";
    error.hidden = false;
    caloriesInput.focus();
    return;
  }

  const newIndex = calorieData.length;
  calorieData.push({ name, calories: -Math.abs(caloriesBurned) });
  activityDurations[newIndex] = duration;

  if (!saveWorkoutState()) {
    error.textContent = "The activity was added for this session, but the browser could not save it permanently. Check localStorage permissions or run the project with a local development server.";
    error.hidden = false;
  } else {
    closeActivityModal();
  }

  renderAll();
}

function handleDeleteActivity(event) {
  const deleteButton = event.target.closest("[data-delete-index]");
  if (!deleteButton) return;

  const index = Number(deleteButton.dataset.deleteIndex);
  if (!Number.isInteger(index) || !calorieData[index] || calorieData[index].calories >= 0) return;

  calorieData.splice(index, 1);

  // Re-index duration metadata after removing an item, keeping calorieData objects
  // limited to the two requested properties: name and calories.
  const nextDurations = {};
  Object.entries(activityDurations).forEach(([oldIndexText, duration]) => {
    const oldIndex = Number(oldIndexText);
    if (oldIndex < index) nextDurations[oldIndex] = duration;
    else if (oldIndex > index) nextDurations[oldIndex - 1] = duration;
  });
  activityDurations = nextDurations;

  saveWorkoutState();
  renderAll();
}

function initWorkoutTracker() {
  renderAll();
  // Seed storage with the initial values so the state is ready for later edits.
  saveWorkoutState();

  document.getElementById("add-activity-button").addEventListener("click", openActivityModal);
  document.getElementById("activity-form").addEventListener("submit", handleAddActivity);
  document.getElementById("activity-list").addEventListener("click", handleDeleteActivity);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeActivityModal);
  });

  const modal = document.getElementById("activity-modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeActivityModal();
  });
}

document.addEventListener("DOMContentLoaded", initWorkoutTracker);
