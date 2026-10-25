(() => {
  const ROUND_SIZE = 10;
  const SETTINGS = {
    easy:    { label: "Easy",    timer: 0 },
    medium:  { label: "Medium",  timer: 0 },
    hard:    { label: "Hard",    timer: 0 },
    extreme: { label: "Extreme", timer: 20 },
  };
  const RANKS = [
    [100, "Outstanding! Dumbledore would award you a hundred points."],
    [80,  "Exceeds Expectations. Hermione would approve."],
    [60,  "Acceptable. You've earned your place at Hogwarts."],
    [40,  "Poor. Time for a trip to the library."],
    [0,   "Troll. Maybe start again at The Boy Who Lived?"],
  ];

  const $ = (id) => document.getElementById(id);
  const screens = { start: $("start"), quiz: $("quiz"), results: $("results") };

  let state = null;
  let timerId = null;

  // ---- storage (best scores); wrapped because it can fail in private mode
  function loadBest() {
    try { return JSON.parse(localStorage.getItem("hpq-best")) || {}; } catch { return {}; }
  }
  function saveBest(best) {
    try { localStorage.setItem("hpq-best", JSON.stringify(best)); } catch { /* ignore */ }
  }
  function loadPref(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function savePref(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(name) {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
    window.scrollTo(0, 0);
  }

  // ---- start screen
  function renderStart() {
    const select = $("readUpTo");
    if (!select.options.length) {
      BOOKS.forEach((title, i) => {
        const opt = document.createElement("option");
        opt.value = i + 1;
        opt.textContent = `Book ${i + 1}: ${title}`;
        select.appendChild(opt);
      });
      select.value = loadPref("hpq-readUpTo", "7");
      const savedDiff = loadPref("hpq-difficulty", "easy");
      const radio = document.querySelector(`input[name=difficulty][value=${savedDiff}]`);
      if (radio) radio.checked = true;
    }
    const best = loadBest();
    document.querySelectorAll("[data-best]").forEach((el) => {
      const b = best[el.dataset.best];
      el.textContent = b != null ? `Best: ${b}/${ROUND_SIZE}` : "";
    });
    $("startError").textContent = "";
    show("start");
  }

  function startQuiz() {
    const difficulty = document.querySelector("input[name=difficulty]:checked").value;
    const readUpTo = Number($("readUpTo").value);
    savePref("hpq-difficulty", difficulty);
    savePref("hpq-readUpTo", String(readUpTo));

    const pool = QUESTIONS[difficulty].filter((q) => q.book <= readUpTo);
    if (pool.length < 3) {
      $("startError").textContent =
        "There aren't enough questions for that combination yet. Try another difficulty or include more books.";
      return;
    }
    state = {
      difficulty,
      readUpTo,
      questions: shuffle(pool).slice(0, ROUND_SIZE).map((q) => ({
        ...q,
        options: shuffle([q.a, ...q.w]),
      })),
      index: 0,
      score: 0,
      missed: [],
      answered: false,
    };
    show("quiz");
    renderQuestion();
  }

  // ---- quiz screen
  function renderQuestion() {
    const q = state.questions[state.index];
    const total = state.questions.length;
    state.answered = false;

    $("progressText").textContent = `Question ${state.index + 1} of ${total}`;
    $("scoreText").textContent = `Score: ${state.score}`;
    $("progressBar").style.width = `${(state.index / total) * 100}%`;
    $("bookTag").textContent = `${SETTINGS[state.difficulty].label} · ${BOOKS[q.book - 1]}`;
    $("questionText").textContent = q.q;
    $("feedback").innerHTML = "";
    $("nextBtn").hidden = true;

    const answers = $("answers");
    answers.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "answer";
      btn.innerHTML = `<span class="key">${i + 1}</span><span></span>`;
      btn.lastChild.textContent = opt;
      btn.addEventListener("click", () => choose(opt));
      answers.appendChild(btn);
    });
    answers.firstChild.focus({ preventScroll: true });

    startTimer();
  }

  function startTimer() {
    clearInterval(timerId);
    const seconds = SETTINGS[state.difficulty].timer;
    const el = $("timer");
    if (!seconds) { el.hidden = true; return; }
    let left = seconds;
    el.hidden = false;
    el.classList.remove("low");
    el.textContent = `${left}s`;
    timerId = setInterval(() => {
      left -= 1;
      el.textContent = `${left}s`;
      if (left <= 5) el.classList.add("low");
      if (left <= 0) {
        clearInterval(timerId);
        choose(null);
      }
    }, 1000);
  }

  function choose(option) {
    if (state.answered) return;
    state.answered = true;
    clearInterval(timerId);
    $("timer").classList.remove("low");

    const q = state.questions[state.index];
    const correct = option === q.a;
    if (correct) state.score += 1;
    else state.missed.push({ q, yours: option });

    document.querySelectorAll(".answer").forEach((btn) => {
      const text = btn.lastChild.textContent;
      btn.disabled = true;
      if (text === q.a) btn.classList.add("correct");
      else if (text === option) btn.classList.add("wrong");
    });

    const verdict = correct
      ? '<span class="verdict ok">Correct!</span>'
      : option === null
        ? '<span class="verdict bad">Out of time!</span>'
        : '<span class="verdict bad">Not quite.</span>';
    const fb = $("feedback");
    fb.innerHTML = `${verdict} <span class="explain"></span>`;
    fb.querySelector(".explain").textContent = q.explain;

    $("scoreText").textContent = `Score: ${state.score}`;
    const next = $("nextBtn");
    next.textContent = state.index + 1 < state.questions.length ? "Next question" : "See results";
    next.hidden = false;
    next.focus({ preventScroll: true });
  }

  function nextQuestion() {
    state.index += 1;
    if (state.index < state.questions.length) renderQuestion();
    else renderResults();
  }

  // ---- results screen
  function renderResults() {
    clearInterval(timerId);
    const total = state.questions.length;
    const pct = Math.round((state.score / total) * 100);
    const rank = RANKS.find(([min]) => pct >= min)[1];

    $("resultTitle").textContent = `${SETTINGS[state.difficulty].label} mode complete`;
    $("resultScore").textContent = `${state.score} / ${total}`;
    $("resultRank").textContent = rank;

    // Only full-length rounds count towards the best score.
    const best = loadBest();
    const prev = best[state.difficulty];
    if (total === ROUND_SIZE && (prev == null || state.score > prev)) {
      best[state.difficulty] = state.score;
      saveBest(best);
      $("resultBest").textContent = prev == null ? "That's your first recorded score." : "New personal best!";
    } else {
      $("resultBest").textContent = prev != null ? `Your best: ${prev}/${ROUND_SIZE}` : "";
    }

    const list = $("reviewList");
    list.innerHTML = "";
    state.missed.forEach(({ q, yours }) => {
      const li = document.createElement("li");
      li.innerHTML = '<div class="rq"></div><div>Your answer: <span class="yours"></span></div><div>Correct: <span class="right"></span></div>';
      li.querySelector(".rq").textContent = q.q;
      li.querySelector(".yours").textContent = yours ?? "(no answer)";
      li.querySelector(".right").textContent = q.a;
      list.appendChild(li);
    });
    $("review").hidden = state.missed.length === 0;

    show("results");
  }

  // ---- events
  $("startBtn").addEventListener("click", startQuiz);
  $("nextBtn").addEventListener("click", nextQuestion);
  $("quitBtn").addEventListener("click", () => { clearInterval(timerId); renderStart(); });
  $("againBtn").addEventListener("click", startQuiz);
  $("menuBtn").addEventListener("click", renderStart);

  // Keyboard: 1-4 to answer while a question is open.
  document.addEventListener("keydown", (e) => {
    if (screens.quiz.hidden || !state || state.answered) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      const btn = document.querySelectorAll(".answer")[n - 1];
      if (btn) btn.click();
    }
  });

  renderStart();
})();
