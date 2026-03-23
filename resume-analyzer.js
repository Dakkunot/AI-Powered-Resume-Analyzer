function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onabort = () => reject(new Error("File read was aborted."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function estimateExperienceYears(text) {
  const yearMatches = text.match(/\b20(0[0-9]|1[0-9]|2[0-9])\b/g);
  if (!yearMatches || yearMatches.length < 2) return null;
  const years = yearMatches.map((y) => parseInt(y, 10)).sort();
  const span = years[years.length - 1] - years[0];
  return span < 0 ? null : Math.max(span, 1);
}

function analyzeSkills(text) {
  const catalog = [
    "python",
    "java",
    "javascript",
    "typescript",
    "c++",
    "sql",
    "html",
    "css",
    "react",
    "node",
    "django",
    "flask",
    "machine learning",
    "deep learning",
    "nlp",
    "data analysis",
    "pandas",
    "numpy",
    "tensorflow",
    "pytorch",
  ];

  const lower = text.toLowerCase();
  return catalog.filter((skill) => lower.includes(skill));
}

function buildRecommendations(text, skills, experienceYears) {
  const recs = [];
  if (!extractEmail(text)) {
    recs.push("Add a professional email address in the header so recruiters can quickly contact you.");
  }
  if (!/summary|objective/i.test(text)) {
    recs.push("Consider adding a short 2–3 sentence professional summary at the top of your resume.");
  }
  if (!/results?|impact|improved|increased|reduced/i.test(text)) {
    recs.push("Highlight measurable impact (numbers, percentages, metrics) for your key achievements.");
  }
  if (!skills.length) {
    recs.push("Add a dedicated skills section listing your core technical and soft skills.");
  }
  if (experienceYears !== null && experienceYears < 2) {
    recs.push("Emphasize projects, internships, and coursework to strengthen an early‑career profile.");
  }
  if (!/ats|applicant tracking/i.test(text)) {
    recs.push("Use simple section headings and bullet points to stay friendly to applicant tracking systems (ATS).");
  }
  return recs;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "this",
  "that",
  "these",
  "those",
  "from",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "i",
  "me",
  "my",
  "us",
  "he",
  "she",
  "them",
  "do",
  "does",
  "did",
  "not",
  "no",
  "yes",
  "such",
  "up",
  "down",
  "into",
  "out",
  "over",
  "under",
  "about",
  "between",
  "within",
  "without",
  "also",
  "including",
  "include",
  "includes",
  "required",
  "requirements",
  "responsibilities",
  "role",
  "work",
  "working",
  "team",
]);

function tokenize(text) {
  const lower = String(text || "").toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  return tokens.filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function extractKeyTermsFromJobDescription(jobDescription, maxTerms = 28) {
  const jd = normalizeText(jobDescription).toLowerCase();
  const tokens = tokenize(jd);
  if (!tokens.length) return [];

  const freq = new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

  const unigrams = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.min(20, maxTerms))
    .map(([t]) => t);

  const bigramFreq = new Map();
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (!a || !b) continue;
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    const phrase = `${a} ${b}`;
    bigramFreq.set(phrase, (bigramFreq.get(phrase) || 0) + 1);
  }

  const bigrams = [...bigramFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c >= 2)
    .slice(0, Math.max(0, maxTerms - unigrams.length))
    .map(([p]) => p);

  const out = [];
  for (const t of [...bigrams, ...unigrams]) {
    if (!out.includes(t)) out.push(t);
    if (out.length >= maxTerms) break;
  }
  return out;
}

function computeTfIdfCosineSimilarity(textA, textB, maxVocab = 600) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (!tokensA.length || !tokensB.length) return 0;

  const df = new Map();
  const freqA = new Map();
  const freqB = new Map();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

  for (const t of new Set([...tokensA])) df.set(t, (df.get(t) || 0) + 1);
  for (const t of new Set([...tokensB])) df.set(t, (df.get(t) || 0) + 1);

  const vocab = new Set([...freqA.keys(), ...freqB.keys()]);
  const vocabArr = [...vocab];

  const vocabRank = (t) => (freqA.get(t) || 0) + (freqB.get(t) || 0);
  vocabArr.sort((x, y) => vocabRank(y) - vocabRank(x));

  const finalVocab = vocabArr.slice(0, maxVocab);
  const N = 2;
  const idf = (term) => Math.log((1 + N) / (1 + (df.get(term) || 0))) + 1;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const term of finalVocab) {
    const tfA = freqA.get(term) || 0;
    const tfB = freqB.get(term) || 0;
    if (tfA === 0 && tfB === 0) continue;

    const wA = tfA * idf(term);
    const wB = tfB * idf(term);
    dot += wA * wB;
    magA += wA * wA;
    magB += wB * wB;
  }

  if (magA <= 0 || magB <= 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function parseResumeFileToText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const name = String(file?.name || "").toLowerCase();

  const isPdf = name.endsWith(".pdf");
  const isDocx = name.endsWith(".docx") || name.endsWith(".doc");

  if (isPdf) {
    if (!window.pdfjsLib) throw new Error("pdf.js not loaded. Please refresh the page.");
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const maxPages = Math.min(pdf.numPages, 8); // MVP guardrail for speed.
    const parts = [];
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const strings = (textContent.items || []).map((it) => it.str).filter(Boolean);
      parts.push(strings.join(" "));
    }
    return normalizeText(parts.join("\n"));
  }

  if (isDocx) {
    if (!window.mammoth) throw new Error("mammoth not loaded. Please refresh the page.");
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return normalizeText(result.value);
  }

  throw new Error("Unsupported file type. Upload a PDF or DOCX.");
}

function buildLocalStrengthsAndGaps({
  matchedTerms,
  missingTerms,
  detectedSkills,
  keywordCoverage,
  similarity,
}) {
  const strengths = [];
  const gaps = [];

  strengths.push(`JD keyword coverage: ${Math.round(keywordCoverage * 100)}%`);
  if (matchedTerms.length) strengths.push(`Matched key terms: ${matchedTerms.slice(0, 10).join(", ")}`);
  if (detectedSkills.length) strengths.push(`Detected skills: ${detectedSkills.slice(0, 10).join(", ")}`);
  strengths.push(`Resume vs JD similarity: ${Math.round(similarity * 100)}%`);

  gaps.push(`Missing key terms: ${missingTerms.slice(0, 12).join(", ") || "None detected"}`);

  return { strengths, gaps };
}

function buildHeuristicRewriteSuggestions({
  jobDescription,
  matchedTerms,
  missingTerms,
  detectedSkills,
}) {
  const missingKeywords = missingTerms.slice(0, 12);
  const skillsPart = detectedSkills.length ? detectedSkills.slice(0, 6).join(", ") : null;
  const skillsText = skillsPart ? `leveraging ${skillsPart}` : "with relevant skills";

  const focusText = missingKeywords.length
    ? `Key focus areas to mirror from the job description: ${missingKeywords.slice(0, 5).join(", ")}.`
    : "You appear to cover many of the job’s key terms; emphasize outcomes and measurable impact.";

  const summaryRewrite =
    `Professional summary: A candidate ${skillsText} and aligned experience for roles like the one pasted above. ` +
    `${focusText} ` +
    "(Customize with 1–2 achievements and metrics from your resume.)";

  const topKeywords = missingKeywords.slice(0, 8);
  const bulletRewrites = topKeywords.map((kw) => ({
    original: null,
    rewritten: `Include ${kw} in a project or achievement bullet (replace with your real example and any metrics).`,
    whyItMatches: [`Missing/underrepresented JD term: ${kw}`],
  }));

  return {
    summaryRewrite,
    bulletRewrites,
    missingKeywords,
  };
}

function saveAnalysisForUser(payload) {
  if (typeof getSession !== "function") return;
  const session = getSession();
  if (!session || !session.email) return;

  try {
    const raw = localStorage.getItem("demo_analyses_v1");
    const all = raw ? JSON.parse(raw) : {};
    const email = session.email;
    const list = Array.isArray(all[email]) ? all[email] : [];
    list.unshift({
      ...payload,
      analyzedAt: Date.now(),
      id: Date.now().toString(),
    });
    all[email] = list.slice(0, 10);
    localStorage.setItem("demo_analyses_v1", JSON.stringify(all));
  } catch {
    // ignore storage errors
  }
}

function initResumeAnalyzer() {
  const form = document.getElementById("analyzerForm");
  const fileInput = document.getElementById("resumeFile");
  const jobDescriptionInput = document.getElementById("jobDescription");
  const state = document.getElementById("analysisState");
  const results = document.getElementById("analysisResults");
  const messageEl = document.querySelector("[data-analyzer-message]");
  const fileNameEl = document.querySelector("[data-file-name]");

  if (!form || !fileInput || !jobDescriptionInput || !results) return;

  const summaryEl = results.querySelector("[data-summary]");
  const contactEl = results.querySelector("[data-contact]");
  const strengthsEl = results.querySelector("[data-strengths]");
  const gapsEl = results.querySelector("[data-gaps]");
  const matchBarEl = results.querySelector("[data-match-meter]");
  const matchScoreEl = results.querySelector("[data-match-score]");
  const rewriteSummaryEl = results.querySelector("[data-rewrite-summary]");
  const rewriteBulletsEl = results.querySelector("[data-rewrite-bullets]");

  function setLoading(isLoading) {
    if (!state) return;
    state.hidden = !isLoading;
    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = isLoading;
  }

  function showInlineMessage(kind, text) {
    if (!messageEl) return;
    if (!text) {
      messageEl.hidden = true;
      messageEl.textContent = "";
      messageEl.removeAttribute("data-kind");
      return;
    }
    messageEl.hidden = false;
    messageEl.setAttribute("data-kind", kind || "error");
    messageEl.textContent = text;
  }

  function resetResults() {
    results.hidden = true;
    if (summaryEl) summaryEl.textContent = "";
    [contactEl, strengthsEl, gapsEl, rewriteBulletsEl].forEach((el) => el && (el.innerHTML = ""));
    if (rewriteSummaryEl) rewriteSummaryEl.textContent = "";
    if (matchBarEl) matchBarEl.style.width = "0%";
    if (matchScoreEl) matchScoreEl.textContent = "";
    showInlineMessage("", "");
  }

  // Ensure initial state is idle
  results.hidden = true;
  if (state) {
    state.hidden = true;
  }

  function updateSelectedFileName() {
    if (!fileNameEl) return;
    const file = fileInput.files && fileInput.files[0];
    fileNameEl.textContent = file?.name ? file.name : "No file selected";
  }
  fileInput.addEventListener("change", () => {
    updateSelectedFileName();
    showInlineMessage("", "");
  });
  updateSelectedFileName();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetResults();

    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      showInlineMessage("error", "Please choose a resume file to analyze.");
      return;
    }

    const jobDescription = String(jobDescriptionInput.value || "").trim();
    if (!jobDescription) {
      showInlineMessage("error", "Please paste a job description to get a match score and targeted rewrites.");
      return;
    }

    // If auth helpers are available, require login first
    if (typeof getSession === "function") {
      const session = getSession();
      if (!session || !session.email) {
        window.location.href = "./login.html";
        return;
      }
    }

    setLoading(true);
    try {
      function escapeHtml(str) {
        return String(str || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      if (!window.pdfjsLib || !window.mammoth) {
        // We allow users to analyze even if one parser fails, but both libraries should be present for robustness.
        // This message helps debug CDN blocking.
        // eslint-disable-next-line no-alert
      }

      const resumeText = await parseResumeFileToText(file);
      if (!resumeText || resumeText.length < 50) {
        throw new Error("Could not extract enough text from the resume. Try a different PDF/DOCX.");
      }

      const emailInDoc = extractEmail(resumeText);
      const experienceYears = estimateExperienceYears(resumeText);

      const jobTerms = extractKeyTermsFromJobDescription(jobDescription, 28);
      const resumeLower = String(resumeText || "").toLowerCase();
      const matchedTerms = jobTerms.filter((t) => resumeLower.includes(t));
      const missingTerms = jobTerms.filter((t) => !resumeLower.includes(t));

      const keywordCoverage = jobTerms.length ? matchedTerms.length / jobTerms.length : 0;
      const similarity = computeTfIdfCosineSimilarity(jobDescription, resumeText);
      const matchScore = Math.round(100 * (0.65 * keywordCoverage + 0.35 * similarity));
      const safeScore = Math.max(0, Math.min(100, matchScore));

      const skills = analyzeSkills(resumeText);
      const { strengths, gaps } = buildLocalStrengthsAndGaps({
        matchedTerms,
        missingTerms,
        detectedSkills: skills,
        keywordCoverage,
        similarity,
      });

      const rewriteSuggestions = buildHeuristicRewriteSuggestions({
        jobDescription,
        matchedTerms,
        missingTerms,
        detectedSkills: skills,
      });

      const recommendations = [
        `Match score: ${safeScore}/100`,
        `Top strengths: ${(strengths.slice(0, 2).join(" | ") || "").slice(0, 140)}`,
        `Top gaps: ${missingTerms.slice(0, 6).join(", ") || "None detected"}`,
        "Tailor your summary and bullets using the rewrite suggestions above.",
      ].filter(Boolean);

      const data = {
        analysisSummary:
          `Match score: ${safeScore}/100. Strengths and gaps are based on your resume text versus the pasted job description.`,
        matchScore: safeScore,
        emailInDoc,
        experienceYears,
        skills,
        strengths,
        gaps,
        rewriteSuggestions,
        recommendations,
      };

      if (summaryEl) summaryEl.textContent = data.analysisSummary || "";
      if (matchScoreEl) matchScoreEl.textContent = `Match score: ${data.matchScore}/100`;
      if (matchBarEl) matchBarEl.style.width = `${data.matchScore}%`;

      if (contactEl) {
        const items = [];
        items.push(
          `<li>${
            data.emailInDoc
              ? "Detected email: <strong>" + escapeHtml(data.emailInDoc) + "</strong>"
              : "No email address detected."
          }</li>`
        );
        items.push(
          `<li>${
            data.experienceYears !== null && data.experienceYears !== undefined
              ? "Estimated years across listed experience: <strong>" +
                escapeHtml(String(data.experienceYears)) +
                "+</strong>"
              : "Could not confidently estimate total years of experience."
          }</li>`
        );
        contactEl.innerHTML = items.join("");
      }

      if (strengthsEl) {
        const strengths = Array.isArray(data.strengths) ? data.strengths : [];
        strengthsEl.innerHTML = strengths.length
          ? strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")
          : "<li>No strengths detected yet. Try using the full job posting text.</li>";
      }

      if (gapsEl) {
        const gaps = Array.isArray(data.gaps) ? data.gaps : [];
        gapsEl.innerHTML = gaps.length ? gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("") : "<li>No gaps detected.</li>";
      }

      if (rewriteSummaryEl) {
        const sr = data.rewriteSuggestions?.summaryRewrite;
        rewriteSummaryEl.textContent = sr ? String(sr) : "";
      }

      if (rewriteBulletsEl) {
        const bullets = data.rewriteSuggestions?.bulletRewrites;
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
          : "<li>No bullet rewrites returned.</li>";
      }

      results.hidden = false;
      showInlineMessage("ok", "Analysis complete. Results are shown below.");

      saveAnalysisForUser({
        emailInDoc: data.emailInDoc ?? null,
        experienceYears: data.experienceYears ?? null,
        skills: data.skills ?? [],
        recommendations: data.recommendations ?? [],
        matchScore: data.matchScore ?? null,
        strengths: data.strengths ?? [],
        gaps: data.gaps ?? [],
        rewriteSuggestions: data.rewriteSuggestions ?? null,
      });
    } catch (err) {
      console.error(err);
      showInlineMessage("error", err?.message || "Something went wrong while analyzing your resume. Please try again.");
    } finally {
      setLoading(false);
    }
  });
}

window.addEventListener("DOMContentLoaded", initResumeAnalyzer);

