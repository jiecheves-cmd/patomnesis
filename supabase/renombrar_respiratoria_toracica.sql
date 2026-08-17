-- Renombra la categoría "Patología respiratoria" a "Patología respiratoria y torácica"
-- en todas las preguntas ya existentes.
update public.questions
set category = 'Patología respiratoria y torácica'
where category = 'Patología respiratoria';
