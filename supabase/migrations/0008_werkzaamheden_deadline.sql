-- Fase 3: optionele deadline bij een werkzaamheid (voorheen "taak").

alter table public.tasks add column deadline_op timestamptz;
