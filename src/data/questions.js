export const seedQuestions = [
  {
    id: "q-lesion-1",
    category: "Lesión celular",
    system: "General",
    topic: "Hipoxia",
    difficulty: "basic",
    stem: "¿Cuál es el cambio reversible más característico en una célula sometida a hipoxia leve?",
    imageUrl: "",
    options: [
      { id: "q-lesion-1-a", text: "Tumefacción celular", isCorrect: true },
      { id: "q-lesion-1-b", text: "Cariorrexis", isCorrect: false },
      { id: "q-lesion-1-c", text: "Necrosis caseosa", isCorrect: false },
      { id: "q-lesion-1-d", text: "Apoptosis masiva", isCorrect: false }
    ],
    explanation:
      "La hipoxia disminuye el ATP y altera la bomba Na+/K+, lo que produce entrada de sodio y agua. La tumefacción celular es reversible si se restaura el aporte de oxígeno.",
    keyPoint: "La tumefacción celular es un dato temprano de lesión reversible."
  },
  {
    id: "q-lesion-2",
    category: "Lesión celular",
    system: "Cardiovascular",
    topic: "Necrosis",
    difficulty: "basic",
    stem: "¿Qué patrón de necrosis se asocia de forma clásica al infarto de miocardio?",
    imageUrl: "",
    options: [
      { id: "q-lesion-2-a", text: "Coagulativa", isCorrect: true },
      { id: "q-lesion-2-b", text: "Licuefactiva", isCorrect: false },
      { id: "q-lesion-2-c", text: "Caseosa", isCorrect: false },
      { id: "q-lesion-2-d", text: "Grasa enzimática", isCorrect: false }
    ],
    explanation:
      "La necrosis coagulativa conserva inicialmente la arquitectura tisular y es típica de infartos en órganos sólidos, excepto el sistema nervioso central.",
    keyPoint: "Infarto en órgano sólido suele implicar necrosis coagulativa."
  },
  {
    id: "q-inflamacion-1",
    category: "Inflamación",
    system: "General",
    topic: "Inflamación aguda",
    difficulty: "basic",
    stem: "¿Qué célula predomina en la inflamación aguda bacteriana durante las primeras horas?",
    imageUrl: "",
    options: [
      { id: "q-inflamacion-1-a", text: "Neutrófilo", isCorrect: true },
      { id: "q-inflamacion-1-b", text: "Linfocito T", isCorrect: false },
      { id: "q-inflamacion-1-c", text: "Macrófago epitelioide", isCorrect: false },
      { id: "q-inflamacion-1-d", text: "Célula plasmática", isCorrect: false }
    ],
    explanation:
      "Los neutrófilos son reclutados rápidamente por mediadores como IL-8, C5a y productos bacterianos. Por eso dominan en muchas infecciones bacterianas agudas.",
    keyPoint: "Agudo bacteriano temprano: piensa en neutrófilos."
  },
  {
    id: "q-inflamacion-2",
    category: "Inflamación",
    system: "General",
    topic: "Granulomas",
    difficulty: "intermediate",
    stem: "Un granuloma con células epitelioides y células gigantes sugiere principalmente qué tipo de respuesta?",
    imageUrl: "",
    options: [
      { id: "q-inflamacion-2-a", text: "Inflamación crónica mediada por macrófagos", isCorrect: true },
      { id: "q-inflamacion-2-b", text: "Shock anafiláctico", isCorrect: false },
      { id: "q-inflamacion-2-c", text: "Necrosis fibrinoide pura", isCorrect: false },
      { id: "q-inflamacion-2-d", text: "Edema por insuficiencia cardíaca", isCorrect: false }
    ],
    explanation:
      "El granuloma aparece cuando el sistema inmune intenta contener un agente persistente. Participan macrófagos activados, linfocitos T y, a veces, necrosis central.",
    keyPoint: "Granuloma significa respuesta crónica organizada frente a un estímulo persistente."
  },
  {
    id: "q-hemo-1",
    category: "Hemodinámica",
    system: "Pulmón",
    topic: "Congestión",
    difficulty: "intermediate",
    stem: "¿Qué hallazgo histológico es más compatible con congestión pulmonar crónica por insuficiencia cardíaca izquierda?",
    imageUrl: "",
    options: [
      { id: "q-hemo-1-a", text: "Macrófagos cargados de hemosiderina", isCorrect: true },
      { id: "q-hemo-1-b", text: "Cuerpos de Councilman", isCorrect: false },
      { id: "q-hemo-1-c", text: "Cristales de Charcot-Leyden", isCorrect: false },
      { id: "q-hemo-1-d", text: "Cuerpos de Mallory-Denk", isCorrect: false }
    ],
    explanation:
      "La presión venosa elevada causa extravasación de eritrocitos. Los macrófagos fagocitan hierro y se convierten en células de insuficiencia cardíaca.",
    keyPoint: "Hemosiderina en macrófagos alveolares orienta a congestión crónica."
  },
  {
    id: "q-neoplasia-1",
    category: "Neoplasia",
    system: "General",
    topic: "Malignidad",
    difficulty: "basic",
    stem: "¿Qué rasgo histológico suele sugerir malignidad en un tumor epitelial?",
    imageUrl: "",
    options: [
      { id: "q-neoplasia-1-a", text: "Invasión de la membrana basal", isCorrect: true },
      { id: "q-neoplasia-1-b", text: "Encapsulación completa", isCorrect: false },
      { id: "q-neoplasia-1-c", text: "Diferenciación perfecta", isCorrect: false },
      { id: "q-neoplasia-1-d", text: "Crecimiento expansivo sin invasión", isCorrect: false }
    ],
    explanation:
      "La invasión del estroma a través de la membrana basal distingue carcinoma invasivo de lesiones in situ. Es un criterio central de malignidad.",
    keyPoint: "La invasión cambia el significado biológico de una lesión epitelial."
  },
  {
    id: "q-respiratorio-1",
    category: "Respiratorio",
    system: "Pulmón",
    topic: "Enfisema",
    difficulty: "intermediate",
    stem: "¿Qué patrón se espera en el enfisema pulmonar?",
    imageUrl: "",
    options: [
      {
        id: "q-respiratorio-1-a",
        text: "Dilatación permanente de espacios aéreos con destrucción de septos",
        isCorrect: true
      },
      { id: "q-respiratorio-1-b", text: "Fibrosis intraalveolar difusa con membranas hialinas", isCorrect: false },
      { id: "q-respiratorio-1-c", text: "Granulomas necrotizantes en bronquiolos", isCorrect: false },
      { id: "q-respiratorio-1-d", text: "Edema alveolar con transudado puro", isCorrect: false }
    ],
    explanation:
      "El enfisema implica destrucción de paredes alveolares sin fibrosis evidente. Esto reduce el área de intercambio gaseoso y la retracción elástica.",
    keyPoint: "Enfisema es espacio aéreo aumentado por pérdida de septos."
  },
  {
    id: "q-endocrino-1",
    category: "Endocrino",
    system: "Tiroides",
    topic: "Carcinoma papilar",
    difficulty: "advanced",
    stem: "¿Qué hallazgo es característico del carcinoma papilar de tiroides?",
    imageUrl: "",
    options: [
      { id: "q-endocrino-1-a", text: "Núcleos claros con surcos y cuerpos de psammoma", isCorrect: true },
      { id: "q-endocrino-1-b", text: "Células de Reed-Sternberg", isCorrect: false },
      { id: "q-endocrino-1-c", text: "Bastones de Auer", isCorrect: false },
      { id: "q-endocrino-1-d", text: "Depósito lineal de IgG en membrana basal", isCorrect: false }
    ],
    explanation:
      "El carcinoma papilar de tiroides muestra núcleos claros, surcos nucleares, inclusiones intranucleares y a veces cuerpos de psammoma.",
    keyPoint: "En tiroides, los rasgos nucleares pesan mucho en el diagnóstico."
  }
];

export const difficultyLabels = {
  basic: "Básica",
  intermediate: "Intermedia",
  advanced: "Avanzada"
};

export const roleLabels = {
  student: "Alumno",
  teacher: "Profesor",
  supervisor: "Supervisor"
};
