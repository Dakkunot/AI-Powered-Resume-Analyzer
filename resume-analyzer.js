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

function initResumeAnalyzer() {
  const form = document.getElementById("analyzerForm");
  const fileInput = document.getElementById("resumeFile");
  const state = document.getElementById("analysisState");
  const results = document.getElementById("analysisResults");

  if (!form || !fileInput || !state || !results) return;

  const summaryEl = results.querySelector("[data-summary]");
  const contactEl = results.querySelector("[data-contact]");
  const skillsEl = results.querySelector("[data-skills]");
  const recsEl = results.querySelector("[data-recommendations]");

  function setLoading(isLoading) {
    state.hidden = !isLoading;
    form.querySelector("button[type='submit']").disabled = isLoading;
  }

  function resetResults() {
    results.hidden = true;
    if (summaryEl) summaryEl.textContent = "";
    [contactEl, skillsEl, recsEl].forEach((el) => el && (el.innerHTML = ""));
  }

  // Ensure initial state is idle
  state.hidden = true;
  results.hidden = true;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetResults();

    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      alert("Please choose a resume file to analyze.");
      return;
    }

    setLoading(true);
    try {
      const text = await readFileAsText(file);

      const email = extractEmail(text);
      const experienceYears = estimateExperienceYears(text);
      const skills = analyzeSkills(text);
      const recommendations = buildRecommendations(text, skills, experienceYears);

      if (summaryEl) {
        summaryEl.textContent =
          "This is an approximate, AI‑style analysis based on the text content of your resume. For the most accurate results, tailor your resume to a specific role and job description.";
      }

      if (contactEl) {
        const items = [];
        items.push(`<li>${email ? "Detected email: <strong>" + email + "</strong>" : "No email address detected."}</li>`);
        items.push(
          `<li>${
            experienceYears !== null
              ? "Estimated years across listed experience: <strong>" + experienceYears + "+</strong>"
              : "Could not confidently estimate total years of experience."
          }</li>`
        );
        contactEl.innerHTML = items.join("");
      }

      if (skillsEl) {
        skillsEl.innerHTML = skills.length
          ? skills.map((s) => `<li>${s}</li>`).join("")
          : "<li>No common technical skills from our catalog were clearly detected. Make sure your key skills are easy to skim.</li>";
      }

      if (recsEl) {
        recsEl.innerHTML = recommendations.map((r) => `<li>${r}</li>`).join("");
      }

      results.hidden = false;
    } catch (err) {
      console.error(err);
      alert("Something went wrong while analyzing your resume. Please try again with a text‑based file.");
    } finally {
      setLoading(false);
    }
  });
}

window.addEventListener("DOMContentLoaded", initResumeAnalyzer);

