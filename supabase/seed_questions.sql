do $$
declare
  qid uuid;
begin
  select id into qid from public.questions where stem = '¿Cuál es el cambio reversible más característico en una célula sometida a hipoxia leve?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Cuál es el cambio reversible más característico en una célula sometida a hipoxia leve?',
      'Lesión celular y muerte',
      'Hipoxia',
      'basic',
      'La hipoxia disminuye el ATP y altera la bomba Na+/K+, lo que produce entrada de sodio y agua. La tumefacción celular es reversible si se restaura el aporte de oxígeno.',
      'La tumefacción celular es un dato temprano de lesión reversible.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Lesión celular y muerte',
        topic = 'Hipoxia',
        difficulty = 'basic',
        explanation = 'La hipoxia disminuye el ATP y altera la bomba Na+/K+, lo que produce entrada de sodio y agua. La tumefacción celular es reversible si se restaura el aporte de oxígeno.',
        key_point = 'La tumefacción celular es un dato temprano de lesión reversible.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Tumefacción celular', true, 1),
    (qid, 'Cariorrexis', false, 2),
    (qid, 'Necrosis caseosa', false, 3),
    (qid, 'Apoptosis masiva', false, 4);

  select id into qid from public.questions where stem = '¿Qué patrón de necrosis se asocia de forma clásica al infarto de miocardio?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Qué patrón de necrosis se asocia de forma clásica al infarto de miocardio?',
      'Lesión celular y muerte',
      'Necrosis',
      'basic',
      'La necrosis coagulativa conserva inicialmente la arquitectura tisular y es típica de infartos en órganos sólidos, excepto el sistema nervioso central.',
      'Infarto en órgano sólido suele implicar necrosis coagulativa.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Lesión celular y muerte',
        topic = 'Necrosis',
        difficulty = 'basic',
        explanation = 'La necrosis coagulativa conserva inicialmente la arquitectura tisular y es típica de infartos en órganos sólidos, excepto el sistema nervioso central.',
        key_point = 'Infarto en órgano sólido suele implicar necrosis coagulativa.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Coagulativa', true, 1),
    (qid, 'Licuefactiva', false, 2),
    (qid, 'Caseosa', false, 3),
    (qid, 'Grasa enzimática', false, 4);

  select id into qid from public.questions where stem = '¿Qué célula predomina en la inflamación aguda bacteriana durante las primeras horas?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Qué célula predomina en la inflamación aguda bacteriana durante las primeras horas?',
      'Inflamación y reparación',
      'Inflamación aguda',
      'basic',
      'Los neutrófilos son reclutados rápidamente por mediadores como IL-8, C5a y productos bacterianos. Por eso dominan en muchas infecciones bacterianas agudas.',
      'Agudo bacteriano temprano: piensa en neutrófilos.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Inflamación y reparación',
        topic = 'Inflamación aguda',
        difficulty = 'basic',
        explanation = 'Los neutrófilos son reclutados rápidamente por mediadores como IL-8, C5a y productos bacterianos. Por eso dominan en muchas infecciones bacterianas agudas.',
        key_point = 'Agudo bacteriano temprano: piensa en neutrófilos.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Neutrófilo', true, 1),
    (qid, 'Linfocito T', false, 2),
    (qid, 'Macrófago epitelioide', false, 3),
    (qid, 'Célula plasmática', false, 4);

  select id into qid from public.questions where stem = 'Un granuloma con células epitelioides y células gigantes sugiere principalmente qué tipo de respuesta?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      'Un granuloma con células epitelioides y células gigantes sugiere principalmente qué tipo de respuesta?',
      'Inflamación y reparación',
      'Granulomas',
      'intermediate',
      'El granuloma aparece cuando el sistema inmune intenta contener un agente persistente. Participan macrófagos activados, linfocitos T y, a veces, necrosis central.',
      'Granuloma significa respuesta crónica organizada frente a un estímulo persistente.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Inflamación y reparación',
        topic = 'Granulomas',
        difficulty = 'intermediate',
        explanation = 'El granuloma aparece cuando el sistema inmune intenta contener un agente persistente. Participan macrófagos activados, linfocitos T y, a veces, necrosis central.',
        key_point = 'Granuloma significa respuesta crónica organizada frente a un estímulo persistente.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Inflamación crónica mediada por macrófagos', true, 1),
    (qid, 'Shock anafiláctico', false, 2),
    (qid, 'Necrosis fibrinoide pura', false, 3),
    (qid, 'Edema por insuficiencia cardíaca', false, 4);

  select id into qid from public.questions where stem = '¿Qué hallazgo histológico es más compatible con congestión pulmonar crónica por insuficiencia cardíaca izquierda?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Qué hallazgo histológico es más compatible con congestión pulmonar crónica por insuficiencia cardíaca izquierda?',
      'Trastornos hemodinámicos',
      'Congestión',
      'intermediate',
      'La presión venosa elevada causa extravasación de eritrocitos. Los macrófagos fagocitan hierro y se convierten en células de insuficiencia cardíaca.',
      'Hemosiderina en macrófagos alveolares orienta a congestión crónica.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Trastornos hemodinámicos',
        topic = 'Congestión',
        difficulty = 'intermediate',
        explanation = 'La presión venosa elevada causa extravasación de eritrocitos. Los macrófagos fagocitan hierro y se convierten en células de insuficiencia cardíaca.',
        key_point = 'Hemosiderina en macrófagos alveolares orienta a congestión crónica.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Macrófagos cargados de hemosiderina', true, 1),
    (qid, 'Cuerpos de Councilman', false, 2),
    (qid, 'Cristales de Charcot-Leyden', false, 3),
    (qid, 'Cuerpos de Mallory-Denk', false, 4);

  select id into qid from public.questions where stem = '¿Qué rasgo histológico suele sugerir malignidad en un tumor epitelial?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Qué rasgo histológico suele sugerir malignidad en un tumor epitelial?',
      'Neoplasia',
      'Malignidad',
      'basic',
      'La invasión del estroma a través de la membrana basal distingue carcinoma invasivo de lesiones in situ. Es un criterio central de malignidad.',
      'La invasión cambia el significado biológico de una lesión epitelial.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Neoplasia',
        topic = 'Malignidad',
        difficulty = 'basic',
        explanation = 'La invasión del estroma a través de la membrana basal distingue carcinoma invasivo de lesiones in situ. Es un criterio central de malignidad.',
        key_point = 'La invasión cambia el significado biológico de una lesión epitelial.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Invasión de la membrana basal', true, 1),
    (qid, 'Encapsulación completa', false, 2),
    (qid, 'Diferenciación perfecta', false, 3),
    (qid, 'Crecimiento expansivo sin invasión', false, 4);

  select id into qid from public.questions where stem = '¿Qué patrón se espera en el enfisema pulmonar?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Qué patrón se espera en el enfisema pulmonar?',
      'Patología respiratoria',
      'Enfisema',
      'intermediate',
      'El enfisema implica destrucción de paredes alveolares sin fibrosis evidente. Esto reduce el área de intercambio gaseoso y la retracción elástica.',
      'Enfisema es espacio aéreo aumentado por pérdida de septos.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Patología respiratoria',
        topic = 'Enfisema',
        difficulty = 'intermediate',
        explanation = 'El enfisema implica destrucción de paredes alveolares sin fibrosis evidente. Esto reduce el área de intercambio gaseoso y la retracción elástica.',
        key_point = 'Enfisema es espacio aéreo aumentado por pérdida de septos.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Dilatación permanente de espacios aéreos con destrucción de septos', true, 1),
    (qid, 'Fibrosis intraalveolar difusa con membranas hialinas', false, 2),
    (qid, 'Granulomas necrotizantes en bronquiolos', false, 3),
    (qid, 'Edema alveolar con transudado puro', false, 4);

  select id into qid from public.questions where stem = '¿Qué hallazgo es característico del carcinoma papilar de tiroides?' limit 1;
  if qid is null then
    insert into public.questions (stem, category, topic, difficulty, explanation, key_point, status)
    values (
      '¿Qué hallazgo es característico del carcinoma papilar de tiroides?',
      'Patología endocrina',
      'Carcinoma papilar',
      'advanced',
      'El carcinoma papilar de tiroides muestra núcleos claros, surcos nucleares, inclusiones intranucleares y a veces cuerpos de psammoma.',
      'En tiroides, los rasgos nucleares pesan mucho en el diagnóstico.',
      'published'
    )
    returning id into qid;
  else
    update public.questions
    set category = 'Patología endocrina',
        topic = 'Carcinoma papilar',
        difficulty = 'advanced',
        explanation = 'El carcinoma papilar de tiroides muestra núcleos claros, surcos nucleares, inclusiones intranucleares y a veces cuerpos de psammoma.',
        key_point = 'En tiroides, los rasgos nucleares pesan mucho en el diagnóstico.',
        status = 'published',
        updated_at = now()
    where id = qid;
  end if;
  delete from public.question_options where question_id = qid;
  insert into public.question_options (question_id, option_text, is_correct, position) values
    (qid, 'Núcleos claros con surcos y cuerpos de psammoma', true, 1),
    (qid, 'Células de Reed-Sternberg', false, 2),
    (qid, 'Bastones de Auer', false, 3),
    (qid, 'Depósito lineal de IgG en membrana basal', false, 4);
end $$;
