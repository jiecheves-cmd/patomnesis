export const seedQuestions = [
  {
    id: "q-lesion-1",
    category: "Lesion celular",
    system: "General",
    topic: "Hipoxia",
    difficulty: "basic",
    stem: "Cual es el cambio reversible mas caracteristico en una celula sometida a hipoxia leve?",
    imageUrl: "",
    options: [
      { id: "q-lesion-1-a", text: "Tumefaccion celular", isCorrect: true },
      { id: "q-lesion-1-b", text: "Cariorrexis", isCorrect: false },
      { id: "q-lesion-1-c", text: "Necrosis caseosa", isCorrect: false },
      { id: "q-lesion-1-d", text: "Apoptosis masiva", isCorrect: false }
    ],
    explanation:
      "La hipoxia disminuye el ATP y altera la bomba Na+/K+, lo que produce entrada de sodio y agua. La tumefaccion celular es reversible si se restaura el aporte de oxigeno.",
    keyPoint: "La tumefaccion celular es un dato temprano de lesion reversible."
  },
  {
    id: "q-lesion-2",
    category: "Lesion celular",
    system: "Cardiovascular",
    topic: "Necrosis",
    difficulty: "basic",
    stem: "Que patron de necrosis se asocia de forma clasica al infarto de miocardio?",
    imageUrl: "",
    options: [
      { id: "q-lesion-2-a", text: "Coagulativa", isCorrect: true },
      { id: "q-lesion-2-b", text: "Licuefactiva", isCorrect: false },
      { id: "q-lesion-2-c", text: "Caseosa", isCorrect: false },
      { id: "q-lesion-2-d", text: "Grasa enzimatica", isCorrect: false }
    ],
    explanation:
      "La necrosis coagulativa conserva inicialmente la arquitectura tisular y es tipica de infartos en organos solidos, excepto el sistema nervioso central.",
    keyPoint: "Infarto en organo solido suele implicar necrosis coagulativa."
  },
  {
    id: "q-inflamacion-1",
    category: "Inflamacion",
    system: "General",
    topic: "Inflamacion aguda",
    difficulty: "basic",
    stem: "Que celula predomina en la inflamacion aguda bacteriana durante las primeras horas?",
    imageUrl: "",
    options: [
      { id: "q-inflamacion-1-a", text: "Neutrofilo", isCorrect: true },
      { id: "q-inflamacion-1-b", text: "Linfocito T", isCorrect: false },
      { id: "q-inflamacion-1-c", text: "Macrofago epitelioide", isCorrect: false },
      { id: "q-inflamacion-1-d", text: "Celula plasmatica", isCorrect: false }
    ],
    explanation:
      "Los neutrofilos son reclutados rapidamente por mediadores como IL-8, C5a y productos bacterianos. Por eso dominan en muchas infecciones bacterianas agudas.",
    keyPoint: "Agudo bacteriano temprano: piensa en neutrofilos."
  },
  {
    id: "q-inflamacion-2",
    category: "Inflamacion",
    system: "General",
    topic: "Granulomas",
    difficulty: "intermediate",
    stem: "Un granuloma con celulas epitelioides y celulas gigantes sugiere principalmente que tipo de respuesta?",
    imageUrl: "",
    options: [
      { id: "q-inflamacion-2-a", text: "Inflamacion cronica mediada por macrofagos", isCorrect: true },
      { id: "q-inflamacion-2-b", text: "Shock anafilactico", isCorrect: false },
      { id: "q-inflamacion-2-c", text: "Necrosis fibrinoide pura", isCorrect: false },
      { id: "q-inflamacion-2-d", text: "Edema por insuficiencia cardiaca", isCorrect: false }
    ],
    explanation:
      "El granuloma aparece cuando el sistema inmune intenta contener un agente persistente. Participan macrofagos activados, linfocitos T y, a veces, necrosis central.",
    keyPoint: "Granuloma significa respuesta cronica organizada frente a un estimulo persistente."
  },
  {
    id: "q-hemo-1",
    category: "Hemodinamica",
    system: "Pulmon",
    topic: "Congestion",
    difficulty: "intermediate",
    stem: "Que hallazgo histologico es mas compatible con congestion pulmonar cronica por insuficiencia cardiaca izquierda?",
    imageUrl: "",
    options: [
      { id: "q-hemo-1-a", text: "Macrofagos cargados de hemosiderina", isCorrect: true },
      { id: "q-hemo-1-b", text: "Cuerpos de Councilman", isCorrect: false },
      { id: "q-hemo-1-c", text: "Cristales de Charcot-Leyden", isCorrect: false },
      { id: "q-hemo-1-d", text: "Cuerpos de Mallory-Denk", isCorrect: false }
    ],
    explanation:
      "La presion venosa elevada causa extravasacion de eritrocitos. Los macrofagos fagocitan hierro y se convierten en celulas de insuficiencia cardiaca.",
    keyPoint: "Hemosiderina en macrofagos alveolares orienta a congestion cronica."
  },
  {
    id: "q-neoplasia-1",
    category: "Neoplasia",
    system: "General",
    topic: "Malignidad",
    difficulty: "basic",
    stem: "Que rasgo histologico suele sugerir malignidad en un tumor epitelial?",
    imageUrl: "",
    options: [
      { id: "q-neoplasia-1-a", text: "Invasion de la membrana basal", isCorrect: true },
      { id: "q-neoplasia-1-b", text: "Encapsulacion completa", isCorrect: false },
      { id: "q-neoplasia-1-c", text: "Diferenciacion perfecta", isCorrect: false },
      { id: "q-neoplasia-1-d", text: "Crecimiento expansivo sin invasion", isCorrect: false }
    ],
    explanation:
      "La invasion del estroma a traves de la membrana basal distingue carcinoma invasivo de lesiones in situ. Es un criterio central de malignidad.",
    keyPoint: "La invasion cambia el significado biologico de una lesion epitelial."
  },
  {
    id: "q-respiratorio-1",
    category: "Respiratorio",
    system: "Pulmon",
    topic: "Enfisema",
    difficulty: "intermediate",
    stem: "Que patron se espera en el enfisema pulmonar?",
    imageUrl: "",
    options: [
      {
        id: "q-respiratorio-1-a",
        text: "Dilatacion permanente de espacios aereos con destruccion de septos",
        isCorrect: true
      },
      { id: "q-respiratorio-1-b", text: "Fibrosis intraalveolar difusa con membranas hialinas", isCorrect: false },
      { id: "q-respiratorio-1-c", text: "Granulomas necrotizantes en bronquiolos", isCorrect: false },
      { id: "q-respiratorio-1-d", text: "Edema alveolar con transudado puro", isCorrect: false }
    ],
    explanation:
      "El enfisema implica destruccion de paredes alveolares sin fibrosis evidente. Esto reduce el area de intercambio gaseoso y la retraccion elastica.",
    keyPoint: "Enfisema es espacio aereo aumentado por perdida de septos."
  },
  {
    id: "q-endocrino-1",
    category: "Endocrino",
    system: "Tiroides",
    topic: "Carcinoma papilar",
    difficulty: "advanced",
    stem: "Que hallazgo es caracteristico del carcinoma papilar de tiroides?",
    imageUrl: "",
    options: [
      { id: "q-endocrino-1-a", text: "Nucleos claros con surcos y cuerpos de psammoma", isCorrect: true },
      { id: "q-endocrino-1-b", text: "Celulas de Reed-Sternberg", isCorrect: false },
      { id: "q-endocrino-1-c", text: "Bastones de Auer", isCorrect: false },
      { id: "q-endocrino-1-d", text: "Deposito lineal de IgG en membrana basal", isCorrect: false }
    ],
    explanation:
      "El carcinoma papilar de tiroides muestra nucleos claros, surcos nucleares, inclusiones intranucleares y a veces cuerpos de psammoma.",
    keyPoint: "En tiroides, los rasgos nucleares pesan mucho en el diagnostico."
  }
];

export const difficultyLabels = {
  basic: "Basica",
  intermediate: "Intermedia",
  advanced: "Avanzada"
};

export const roleLabels = {
  student: "Alumno",
  teacher: "Profesor",
  supervisor: "Supervisor"
};
