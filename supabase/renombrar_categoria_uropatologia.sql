-- Renombra la categoría "Patología renal y urinaria" a "Uropatología"
-- en todas las preguntas ya existentes.
update public.questions
set category = 'Uropatología'
where category = 'Patología renal y urinaria';
