-- Fase 4 hotfix: de policy "maker of admin beheert het delen" op task_shares
-- bevroeg rechtstreeks (niet via een security-definer functie) de tasks-tabel
-- om te checken wie de taak heeft aangemaakt. Omdat de select-policy op tasks
-- op zijn beurt task_shares bevraagt, ontstond een oneindige RLS-recursie
-- zodra iemand een taak probeerde aan te maken of te bekijken.

create or replace function public.is_taak_eigenaar(p_task_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.tasks t where t.id = p_task_id and t.created_by = auth.uid()
  );
$$;

drop policy if exists "maker of admin beheert het delen" on public.task_shares;
create policy "maker of admin beheert het delen"
  on public.task_shares for all to authenticated
  using (public.is_admin() or public.is_taak_eigenaar(task_id))
  with check (public.is_admin() or public.is_taak_eigenaar(task_id));
