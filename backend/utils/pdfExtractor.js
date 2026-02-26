const fs = require("fs");
const pdf = require("pdf-parse");

process.env.PDFJS_DISABLE_WARNINGS = "true";

async function extractSectionsFromPdf(filePath) {
  console.log("📄 Reading PDF:", filePath);

  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);

  if (!data.text || !data.text.trim()) {
    throw new Error("PDF has no extractable text");
  }

  const lines = data.text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const sections = [];
  let currentSection = null;
  let qNo = 1;

  for (const line of lines) {

    /* 🔹 SECTION / TOPIC DETECTION (FIXED FOR YOUR PDF) */
    if (
      !/^\d/.test(line) &&        // not starting with number
      line.length < 60 &&         // reasonable heading length
      !line.endsWith("?") &&      // not a question
      !line.includes(".")         // not numbered text
    ) {
      currentSection = {
        section: line,
        questions: []
      };
      sections.push(currentSection);
      qNo = 1;
      continue;
    }

    /* 🔹 QUESTION DETECTION */
    if (/^(\d+\s+|\d+\.|\d+\)|Q\d+)/i.test(line)) {

      // Fallback if no section detected yet
      if (!currentSection) {
        currentSection = {
          section: "General",
          questions: []
        };
        sections.push(currentSection);
      }

      currentSection.questions.push({
        id: qNo++,
        text: line.replace(
          /^(\d+\s+|\d+\.|\d+\)|Q\d+)/i,
          ""
        ).trim()
      });
    }
  }

  if (!sections.length || sections.every(s => s.questions.length === 0)) {
    throw new Error("No topics or questions detected in PDF");
  }

  return sections;
}

module.exports = { extractSectionsFromPdf };
