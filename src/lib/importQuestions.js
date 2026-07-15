import { questionThemes } from "../data/questions.js";

const difficultyAliases = {
  avanzada: "advanced",
  advanced: "advanced",
  alta: "advanced",
  basica: "basic",
  basic: "basic",
  baja: "basic",
  intermedia: "intermediate",
  intermediate: "intermediate",
  media: "intermediate"
};

const importColumnAliases = {
  category: ["tema_principal", "tema principal", "categoria", "categoría", "category"],
  topic: ["tema", "subtema", "topic"],
  difficulty: ["dificultad", "nivel", "difficulty"],
  stem: ["enunciado", "pregunta", "question", "stem"],
  imageUrl: ["imagen", "imagen_url", "url_imagen", "image", "image_url", "imageurl"],
  correct: ["respuesta_correcta", "respuesta correcta", "correcta", "correct", "answer"],
  distractor1: ["distractor_1", "distractor 1", "opcion_b", "opción_b", "opcion b", "opción b"],
  distractor2: ["distractor_2", "distractor 2", "opcion_c", "opción_c", "opcion c", "opción c"],
  distractor3: ["distractor_3", "distractor 3", "opcion_d", "opción_d", "opcion d", "opción d"],
  explanation: ["explicacion", "explicación", "feedback", "explanation"],
  keyPoint: ["idea_clave", "idea clave", "clave", "key_point", "keypoint"]
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[\s-]+/g, "_");
}

function getImportValue(row, field) {
  const aliases = importColumnAliases[field].map(normalizeHeader);
  const match = Object.entries(row).find(([key]) => aliases.includes(normalizeHeader(key)));
  return match ? String(match[1] || "").trim() : "";
}

function normalizeDifficulty(value) {
  return difficultyAliases[normalizeText(value)] || "basic";
}

function normalizeTheme(value) {
  const normalized = normalizeText(value);
  return questionThemes.find((theme) => normalizeText(theme) === normalized) || value || questionThemes[0];
}

function buildImportedQuestions(rows) {
  const imported = [];
  const skipped = [];
  const timestamp = Date.now();

  rows.forEach((row, index) => {
    const stem = getImportValue(row, "stem");
    const correct = getImportValue(row, "correct");
    const distractors = [
      getImportValue(row, "distractor1"),
      getImportValue(row, "distractor2"),
      getImportValue(row, "distractor3")
    ].filter(Boolean);

    if (!stem || !correct || distractors.length < 1) {
      skipped.push(index + 2);
      return;
    }

    const id = `import-${timestamp}-${index}`;
    imported.push({
      id,
      category: normalizeTheme(getImportValue(row, "category")),
      topic: getImportValue(row, "topic"),
      difficulty: normalizeDifficulty(getImportValue(row, "difficulty")),
      stem,
      imageUrl: getImportValue(row, "imageUrl"),
      options: [correct, ...distractors].slice(0, 4).map((text, optionIndex) => ({
        id: `${id}-option-${optionIndex}`,
        text,
        isCorrect: optionIndex === 0
      })),
      explanation: getImportValue(row, "explanation"),
      keyPoint: getImportValue(row, "keyPoint"),
      status: "draft"
    });
  });

  return { imported, skipped };
}

async function readQuestionRowsFromFile(file) {
  const { read, utils } = await import("xlsx");
  const data = await file.arrayBuffer();
  const workbook = read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return utils.sheet_to_json(sheet, { defval: "" });
}

function getStatusLabel(status) {
  if (status === "draft") return "Pendiente";
  if (status === "archived") return "Archivada";
  return "Publicada";
}

function buildExportRows(questions) {
  return questions.map((question) => {
    const correctOption = question.options.find((option) => option.isCorrect);
    const distractors = question.options.filter((option) => !option.isCorrect);

    return {
      tema_principal: question.category,
      tema: question.topic || "",
      dificultad: question.difficulty,
      estado: getStatusLabel(question.status),
      enunciado: question.stem,
      imagen: question.imageUrl || "",
      respuesta_correcta: correctOption?.text || "",
      distractor_1: distractors[0]?.text || "",
      distractor_2: distractors[1]?.text || "",
      distractor_3: distractors[2]?.text || "",
      explicacion: question.explanation || "",
      idea_clave: question.keyPoint || ""
    };
  });
}

async function exportQuestionsToXlsx(questions, filename = "preguntas-patomnesis.xlsx") {
  const { utils, writeFile } = await import("xlsx");
  const rows = buildExportRows(questions);
  const sheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "Preguntas");
  writeFile(workbook, filename);
}

export {
  difficultyAliases,
  importColumnAliases,
  normalizeText,
  normalizeHeader,
  getImportValue,
  normalizeDifficulty,
  normalizeTheme,
  buildImportedQuestions,
  buildExportRows,
  exportQuestionsToXlsx,
  readQuestionRowsFromFile
};
