const STORAGE_KEYS = {
  users: "demo_users_v2",
  session: "demo_session_v2",
  analyses: "demo_analyses_v1",
};

function clearLegacyStorage() {
  localStorage.removeItem("demo_users_v1");
  localStorage.removeItem("demo_session_v1");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    const users = raw ? JSON.parse(raw) : [];
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function setSession(email) {
  localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({ email, createdAt: Date.now() })
  );
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function validatePassword(pw) {
  const password = String(pw || "");
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

function showMessage(el, kind, text) {
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.removeAttribute("data-kind");
    return;
  }
  el.hidden = false;
  el.setAttribute("data-kind", kind);
  el.textContent = text;
}

function requireLoggedInOrRedirect() {
  const session = getSession();
  if (!session || !session.email) {
    window.location.href = "./login.html";
  }
  return session;
}

function initLoginPage() {
  const form = document.querySelector("[data-form='login']");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const message = document.querySelector("[data-message]");

  const session = getSession();
  if (session?.email) {
    window.location.href = "./dashboard.html";
    return;
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    showMessage(message, "", "");

    const email = normalizeEmail(emailInput?.value);
    const password = String(passwordInput?.value || "");

    if (!email) return showMessage(message, "error", "Please enter your email.");
    if (!password) return showMessage(message, "error", "Please enter your password.");

    const users = loadUsers();
    const user = users.find((u) => u.email === email);
    if (!user || user.password !== password) {
      return showMessage(message, "error", "Invalid email or password.");
    }

    setSession(email);
    window.location.href = "./dashboard.html";
  });
}

function initSignupPage() {
  const form = document.querySelector("[data-form='signup']");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const confirmInput = document.querySelector("#confirmPassword");
  const message = document.querySelector("[data-message]");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    showMessage(message, "", "");

    const email = normalizeEmail(emailInput?.value);
    const password = String(passwordInput?.value || "");
    const confirm = String(confirmInput?.value || "");

    if (!email) return showMessage(message, "error", "Please enter your email.");
    const pwErr = validatePassword(password);
    if (pwErr) return showMessage(message, "error", pwErr);
    if (password !== confirm) {
      return showMessage(message, "error", "Passwords do not match.");
    }

    const users = loadUsers();
    if (users.some((u) => u.email === email)) {
      return showMessage(message, "error", "An account with this email already exists.");
    }

    users.push({ email, password, createdAt: Date.now() });
    saveUsers(users);

    window.location.href = "./login.html?registered=1";
  });
}

function initDashboardPage() {
  const session = requireLoggedInOrRedirect();

  const who = document.querySelector("[data-who]");
  const logoutBtn = document.querySelector("[data-logout]");
  if (who) who.textContent = session?.email || "";

   // Populate dashboard with latest analysis data
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.analyses);
    const all = raw ? JSON.parse(raw) : {};
    const list = Array.isArray(all[session.email]) ? all[session.email] : [];

    const historyBody = document.querySelector("[data-history-rows]");
    const resultsRoot = document.querySelector("[data-dashboard-results]");
    const summaryEl = resultsRoot?.querySelector("[data-summary]");
    const contactEl = resultsRoot?.querySelector("[data-contact]");
    const strengthsEl = resultsRoot?.querySelector("[data-strengths]");
    const gapsEl = resultsRoot?.querySelector("[data-gaps]");
    const matchBarEl = resultsRoot?.querySelector("[data-match-meter]");
    const matchScoreEl = resultsRoot?.querySelector("[data-match-score]");
    const rewriteSummaryEl = resultsRoot?.querySelector("[data-rewrite-summary]");
    const rewriteBulletsEl = resultsRoot?.querySelector("[data-rewrite-bullets]");

    function escapeHtml(str) {
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    if (historyBody) {
      historyBody.innerHTML = "";
      if (!list.length) {
        historyBody.innerHTML = '<tr class="empty"><td colspan="4">No analyses yet. Upload a resume from the home page to get started.</td></tr>';
      } else {
        historyBody.innerHTML = list
          .map((item) => {
            const date = new Date(item.analyzedAt).toLocaleString();
            const exp = item.experienceYears != null ? `${item.experienceYears}+ yrs` : "N/A";
            const skills = (item.skills || []).slice(0, 4);
            const skillsHtml = skills.length
              ? skills.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join(" ")
              : "—";

            const score =
              item.matchScore != null && item.matchScore !== undefined
                ? `${escapeHtml(String(item.matchScore))}/100`
                : "—";

            return `<tr><td>${date}</td><td>${exp}</td><td>${skillsHtml}</td><td><span class="pill pill--score">${score}</span></td></tr>`;
          })
          .join("");
      }
    }

    const latest = list[0];
    if (latest && resultsRoot) {
      if (summaryEl) {
        summaryEl.textContent =
          latest.matchScore != null
            ? `This is your latest saved analysis. Match score: ${latest.matchScore}/100. Re-run the analyzer from the home page to refresh these insights.`
            : "This is your latest saved analysis. Re-run the analyzer from the home page to refresh these insights.";
      }

      if (matchScoreEl) {
        matchScoreEl.textContent =
          latest.matchScore != null ? `Match score: ${latest.matchScore}/100` : "";
      }
      if (matchBarEl) {
        const s =
          latest.matchScore != null && Number.isFinite(Number(latest.matchScore))
            ? Math.max(0, Math.min(100, Number(latest.matchScore)))
            : 0;
        matchBarEl.style.width = `${s}%`;
      }

      if (contactEl) {
        const items = [];
        items.push(
          `<li>${
            latest.emailInDoc
              ? "Detected email: <strong>" + latest.emailInDoc + "</strong>"
              : "No email address detected in the last analyzed resume."
          }</li>`
        );
        items.push(
          `<li>${
            latest.experienceYears != null
              ? "Estimated years across listed experience: <strong>" + latest.experienceYears + "+</strong>"
              : "Could not confidently estimate total years of experience."
          }</li>`
        );
        contactEl.innerHTML = items.join("");
      }

      if (strengthsEl) {
        const strengths = Array.isArray(latest.strengths) ? latest.strengths : [];
        strengthsEl.innerHTML = strengths.length
          ? strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")
          : "<li>No strengths detected yet. Analyze a resume against a job description to see strengths here.</li>";
      }

      if (gapsEl) {
        const gaps = Array.isArray(latest.gaps) ? latest.gaps : [];
        gapsEl.innerHTML = gaps.length
          ? gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("")
          : "<li>No gaps stored yet.</li>";
      }

      if (rewriteSummaryEl) {
        const sr = latest.rewriteSuggestions?.summaryRewrite;
        rewriteSummaryEl.textContent = sr ? String(sr) : "";
      }

      if (rewriteBulletsEl) {
        const bullets = latest.rewriteSuggestions?.bulletRewrites;
        const arr = Array.isArray(bullets) ? bullets : [];
        rewriteBulletsEl.innerHTML = arr.length
          ? arr
              .slice(0, 6)
              .map((b) => {
                const rewritten = b?.rewritten ? String(b.rewritten) : "";
                const whyArr = Array.isArray(b?.whyItMatches) ? b.whyItMatches : [];
                const whyLine = whyArr.length
                  ? `<div class="small">Why it matches: ${escapeHtml(whyArr.join(", "))}</div>`
                  : "";
                const original = b?.original ? String(b.original) : "";
                const originalLine = original
                  ? `<div class="small">Original bullet: ${escapeHtml(original)}</div>`
                  : "";
                return `<li><strong>Rewritten:</strong> ${escapeHtml(rewritten)}${originalLine}${whyLine}</li>`;
              })
              .join("")
          : "<li>No rewrite suggestions stored yet.</li>";
      }
    } else if (resultsRoot) {
      resultsRoot.hidden = true;
    }
  } catch {
    // ignore dashboard population errors
  }

  logoutBtn?.addEventListener("click", () => {
    clearSession();
    window.location.href = "./login.html";
  });
}

function initCommon() {
  clearLegacyStorage();
  const message = document.querySelector("[data-message]");
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "1") {
    showMessage(message, "ok", "Account created. Please log in.");
  }
}

window.AuthDemo = {
  initCommon,
  initLoginPage,
  initSignupPage,
  initDashboardPage,
};

