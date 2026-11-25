-- Percorsi di 3 mesi (onboarding + 2 check, 3 senza onboarding), oltre a 6
-- mesi e 1 anno. Il check omaggio "incluso" non si sceglie più per i nuovi
-- percorsi (decisione del nutrizionista): resta ammesso nella tabella per i
-- percorsi già creati così; i nuovi passano dalla validazione dell'app.
alter table public.client_journeys
  drop constraint client_journeys_duration_months_check;
alter table public.client_journeys
  add constraint client_journeys_duration_months_check
  check (duration_months in (3, 6, 12));
