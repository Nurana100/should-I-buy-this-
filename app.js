const STORAGE_KEY = "should-i-buy-this-history-v1";
const form = document.querySelector("#decision-form");
const itemInput = document.querySelector("#item");
const priceInput = document.querySelector("#price");
const incomeInput = document.querySelector("#income");
const desireInput = document.querySelector("#desire");
const desireValue = document.querySelector("#desire-value");
const apiKeyInput = document.querySelector("#api-key");
const submitButton = form.querySelector("button[type=submit]");
const formMessage = document.querySelector("#form-message");
const emptyResult = document.querySelector("#empty-result");
const decisionResult = document.querySelector("#decision-result");
const verdictElement = document.querySelector("#verdict");
const sourceBadge = document.querySelector("#source-badge");
const resultItem = document.querySelector("#result-item");
const reasonElement = document.querySelector("#reason");
const scoreLabel = document.querySelector("#score-label");
const scoreFill = document.querySelector("#score-fill");
const considerationsElement = document.querySelector("#considerations");
const nextStepElement = document.querySelector("#next-step");
const savedConfirmation = document.querySelector("#saved-confirmation");
const historyList = document.querySelector("#history-list");
const historyEmpty = document.querySelector("#history-empty");
const clearHistoryButton = document.querySelector("#clear-history");

const RECENCY_LABELS = {
  recent: "in the past month",
  season: "1–6 months ago",
  long: "more than 6 months ago",
  never: "never",
};

let history = loadHistory();

desireInput.addEventListener("input", () => {
  desireValue.value = `${desireInput.value} / 10`;
  const percentage = ((Number(desireInput.value) - 1) / 9) * 100;
  desireInput.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, #d8ded6 ${percentage}%, #d8ded6 100%)`;
});

document.querySelector("#key-visibility").addEventListener("click", (event) => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  event.currentTarget.textContent = isPassword ? "Hide" : "Show";
  event.currentTarget.setAttribute("aria-label", `${isPassword ? "Hide" : "Show"} API key`);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();
  const inputs = getValidatedInputs();
  if (!inputs) return;

  setLoading(true);
  const deterministic = calculateDeterministicDecision(inputs);
  let result = deterministic;
  let source = "Offline guide";

  if (apiKeyInput.value.trim()) {
    try {
      result = await getGptDecision(inputs, deterministic);
      source = "GPT second opinion";
      showMessage("GPT considered your answers alongside budget guardrails.", "info");
    } catch (error) {
      console.warn("GPT request failed; using offline decision.", error);
      showMessage("Couldn’t reach GPT, so I used the offline guide instead.", "info");
    }
  }

  const savedDecision = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    item: inputs.item,
    price: inputs.price,
    income: inputs.income,
    desire: inputs.desire,
    recency: inputs.recency,
    verdict: result.verdict,
    score: result.score,
    reason: result.reason,
    considerations: result.considerations,
    nextStep: result.nextStep,
    source,
    outcome: "pending",
    reviewDate: result.verdict === "Wait a week" ? addDays(new Date(), 7).toISOString() : null,
  };

  history.unshift(savedDecision);
  saveHistory();
  renderResult(savedDecision);
  renderHistory();
  setLoading(false);
});

clearHistoryButton.addEventListener("click", () => {
  if (!window.confirm("Clear all saved decisions from this browser?")) return;
  history = [];
  saveHistory();
  renderHistory();
});

function getValidatedInputs() {
  const item = itemInput.value.trim();
  const price = Number(priceInput.value);
  const income = Number(incomeInput.value);
  const desire = Number(desireInput.value);
  const recency = new FormData(form).get("recency");

  if (!item) {
    showMessage("Add the item you’re considering.");
    itemInput.focus();
    return null;
  }
  if (!Number.isFinite(price) || price <= 0) {
    showMessage("Enter a price greater than 0.");
    priceInput.focus();
    return null;
  }
  if (!Number.isFinite(income) || income <= 0) {
    showMessage("Monthly take-home income must be greater than 0 so the app can judge affordability.");
    incomeInput.focus();
    return null;
  }
  if (price > 100000000 || income > 100000000) {
    showMessage("Please use a realistic value below 100,000,000.");
    return null;
  }
  return { item, price, income, desire, recency };
}

function calculateBudgetSignals(inputs) {
  const incomeShare = inputs.price / inputs.income;
  const recencyAdjustment = { recent: -2.2, season: -0.6, long: 0.65, never: 1.1 }[inputs.recency];
  const affordabilityScore = Math.max(0, Math.min(10, 10 - incomeShare * 20));
  const desireScore = inputs.desire;
  const score = clamp((affordabilityScore * 0.62) + (desireScore * 0.28) + recencyAdjustment, 0, 10);

  return {
    incomeShare,
    affordabilityScore: round(affordabilityScore),
    score: round(score),
    financialGuardrail: incomeShare >= 1 ? "The item costs at least a full month’s take-home income." : incomeShare >= 0.35 ? "The item is a substantial share of one month’s take-home income." : "The item is within a modest share of one month’s take-home income.",
  };
}

function calculateDeterministicDecision(inputs) {
  const signals = calculateBudgetSignals(inputs);
  let verdict;
  if (signals.incomeShare >= 0.5 || (signals.incomeShare >= 0.3 && inputs.desire <= 5)) verdict = "Skip it";
  else if (signals.score >= 7.2 && inputs.recency !== "recent") verdict = "Buy it";
  else verdict = "Wait a week";

  const share = percent(signals.incomeShare);
  const recencyText = RECENCY_LABELS[inputs.recency];
  const reasonByVerdict = {
    "Buy it": `${inputs.item} is about ${share} of your monthly income, and your interest has enough weight to support it.`,
    "Wait a week": `${inputs.item} is about ${share} of your monthly income. The pause gives you space to see whether the want lasts.`,
    "Skip it": `${inputs.item} would take about ${share} of your monthly income, which makes this a high-impact purchase right now.`,
  };
  const nextStepByVerdict = {
    "Buy it": "If it fits your wider budget, buy it intentionally—then enjoy it without reopening the debate.",
    "Wait a week": "Save this decision. Come back on the revisit date; buy only if it still feels useful, not just exciting.",
    "Skip it": "Leave it on a wish list. Reconsider when the price, income, or your need for it changes.",
  };

  return {
    verdict,
    score: signals.score,
    reason: reasonByVerdict[verdict],
    considerations: [`It uses ${share} of one month’s take-home income.`, `You rated your desire ${inputs.desire} out of 10.`, `You last bought something similar ${recencyText}.`],
    nextStep: nextStepByVerdict[verdict],
  };
}

async function getGptDecision(inputs, deterministic) {
  const prompt = `You are a calm, practical purchase coach. Make a recommendation based on the person’s raw inputs. You are not judging their worth or giving financial advice. Return only the requested JSON.\n\nPurchase inputs:\n- Item: ${inputs.item}\n- Price: ${inputs.price}\n- Monthly take-home income: ${inputs.income}\n- Desire (1–10): ${inputs.desire}\n- Last bought something similar: ${RECENCY_LABELS[inputs.recency]}\n\nReliable budget signals you must consider (but you should choose the verdict yourself):\n- Price is ${percent(calculateBudgetSignals(inputs).incomeShare)} of monthly income\n- ${calculateBudgetSignals(inputs).financialGuardrail}\n\nUse “Buy it” only for a genuinely reasonable purchase. Choose “Wait a week” for uncertainty or when a cooling-off period is sensible. Choose “Skip it” for a poor fit right now. Keep the reason kind and specific; do not invent facts.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKeyInput.value.trim()}` },
    body: JSON.stringify({
      model: "gpt-5.6",
      store: false,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "purchase_recommendation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["verdict", "score", "reason", "considerations", "nextStep"],
            properties: {
              verdict: { type: "string", enum: ["Buy it", "Wait a week", "Skip it"] },
              score: { type: "number", minimum: 0, maximum: 10 },
              reason: { type: "string", minLength: 20, maxLength: 280 },
              considerations: { type: "array", minItems: 2, maxItems: 3, items: { type: "string", minLength: 5, maxLength: 120 } },
              nextStep: { type: "string", minLength: 15, maxLength: 180 },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details?.error?.message || `Request failed (${response.status})`);
  }
  const data = await response.json();
  const output = data.output_text || data.output?.flatMap((entry) => entry.content || []).find((part) => part.type === "output_text")?.text;
  if (!output) throw new Error("No text returned from the model.");
  const recommendation = JSON.parse(output);
  if (!isValidRecommendation(recommendation)) throw new Error("The model returned an unexpected decision.");

  // These are non-negotiable safety rails, not a second scoring system.
  const signals = calculateBudgetSignals(inputs);
  if (signals.incomeShare >= 1 && recommendation.verdict === "Buy it") {
    recommendation.verdict = "Skip it";
    recommendation.reason = `${recommendation.reason} Because it costs at least a month of take-home income, it’s safer to skip it for now.`;
    recommendation.nextStep = "Keep it on a wish list and revisit only after saving specifically for it.";
  }
  recommendation.score = clamp(round(Number(recommendation.score)), 0, 10);
  return recommendation;
}

function isValidRecommendation(value) {
  return value && ["Buy it", "Wait a week", "Skip it"].includes(value.verdict) && Number.isFinite(Number(value.score)) && typeof value.reason === "string" && Array.isArray(value.considerations) && typeof value.nextStep === "string";
}

function renderResult(decision) {
  emptyResult.hidden = true;
  decisionResult.hidden = false;
  verdictElement.textContent = decision.verdict;
  verdictElement.className = `verdict ${verdictClass(decision.verdict)}`;
  sourceBadge.textContent = decision.source;
  resultItem.textContent = `For ${decision.item} · ${formatMoney(decision.price)}`;
  reasonElement.textContent = decision.reason;
  scoreLabel.textContent = `${Number(decision.score).toFixed(1)} / 10`;
  scoreFill.style.width = `${Number(decision.score) * 10}%`;
  scoreFill.style.background = decision.verdict === "Skip it" ? "var(--skip)" : decision.verdict === "Wait a week" ? "#b38b35" : "var(--sage-ink)";
  considerationsElement.replaceChildren(...decision.considerations.map((consideration) => {
    const line = document.createElement("div");
    line.className = "consideration";
    line.textContent = consideration;
    return line;
  }));
  nextStepElement.textContent = decision.nextStep;
  savedConfirmation.hidden = false;
}

function renderHistory() {
  historyList.replaceChildren();
  const hasHistory = history.length > 0;
  historyEmpty.hidden = hasHistory;
  clearHistoryButton.hidden = !hasHistory;

  history.forEach((decision) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const details = document.createElement("div");
    const titleRow = document.createElement("div");
    titleRow.className = "history-title-row";
    const title = document.createElement("h3");
    title.textContent = decision.item;
    const verdict = document.createElement("span");
    verdict.className = `history-verdict ${verdictClass(decision.verdict)}`;
    verdict.textContent = decision.verdict;
    titleRow.append(title, verdict);
    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = `${formatMoney(decision.price)} · decided ${formatDate(decision.createdAt)}`;
    details.append(titleRow, meta);
    if (decision.reviewDate && decision.outcome === "pending") {
      const review = document.createElement("p");
      review.className = "history-note";
      review.textContent = revisitCopy(decision.reviewDate);
      details.append(review);
    }
    const outcome = document.createElement("select");
    outcome.className = "outcome-control";
    outcome.setAttribute("aria-label", `What happened with ${decision.item}?`);
    [["pending", "What happened?"], ["bought", "I bought it"], ["skipped", "I didn’t buy it"]].forEach(([value, label]) => {
      const option = new Option(label, value, false, decision.outcome === value);
      outcome.add(option);
    });
    outcome.addEventListener("change", () => {
      const saved = history.find((entry) => entry.id === decision.id);
      saved.outcome = outcome.value;
      saveHistory();
      renderHistory();
    });
    li.append(details, outcome);
    historyList.append(li);
  });
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
function saveHistory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); }
function setLoading(loading) { submitButton.disabled = loading; submitButton.innerHTML = loading ? "<span>Thinking…</span><span aria-hidden=\"true\">✦</span>" : "<span>Help me decide</span><span aria-hidden=\"true\">→</span>"; }
function showMessage(message, type = "error") { formMessage.textContent = message; formMessage.className = `form-message ${type === "info" ? "info" : ""}`; }
function clearMessage() { formMessage.textContent = ""; formMessage.className = "form-message"; }
function verdictClass(verdict) { return verdict === "Buy it" ? "buy" : verdict === "Skip it" ? "skip" : "wait"; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function round(value) { return Math.round(value * 10) / 10; }
function percent(value) { return new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: value < .1 ? 1 : 0 }).format(value); }
function formatMoney(value) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value); }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function revisitCopy(reviewDate) { const remaining = Math.ceil((new Date(reviewDate) - new Date()) / 86400000); return remaining > 0 ? `Cooling-off tracker: revisit in ${remaining} day${remaining === 1 ? "" : "s"}.` : "Cooling-off tracker: ready to revisit today."; }

renderHistory();
