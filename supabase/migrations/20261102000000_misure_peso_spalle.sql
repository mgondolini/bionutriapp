-- Misure periodiche: peso (ogni 30 giorni, come le circonferenze), nuova
-- circonferenza delle spalle e "Gluteo" rinominata "Fianchi" (solo il nome).
-- Peso e spalle hanno frequenza 'monthly_30d': l'app le tratta come le
-- circonferenze (stato, scadenza, grafico); l'unità viene da metrics.unit.

-- Misure predefinite dei nuovi studi
create or replace function private.seed_default_metrics()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.metrics
    (studio_id, key, name, unit, value_type, frequency, min_value, max_value, icon, instructions, sort_order, default_goal, goal_unit)
  values
    -- DA CONFERMARE: limiti del peso e delle circonferenze
    (new.id, 'weight',         'Peso',             'kg', 'decimal', 'monthly_30d', 20, 300, 'weight', 'Ogni 30 giorni inseriscilo qui', 1, null, null),
    (new.id, 'circ_shoulders', 'Circ. Spalle',     'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 5, null, null),
    (new.id, 'circ_waist',     'Circ. Vita',       'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 10, null, null),
    (new.id, 'circ_navel',     'Circ. Ombelicale', 'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 20, null, null),
    (new.id, 'circ_glutes',    'Circ. Fianchi',    'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 30, null, null),
    (new.id, 'circ_right_leg', 'Circ. Gamba dx',   'cm', 'decimal', 'monthly_30d', 10, 150, 'ruler', 'Ogni 30 giorni inseriscila qui', 40, null, null),
    (new.id, 'circ_right_arm', 'Circ. Braccio dx', 'cm', 'decimal', 'monthly_30d', 10, 100, 'ruler', 'Ogni 30 giorni inseriscila qui', 50, null, null),
    -- DA CONFERMARE: obiettivi predefiniti 8.000 passi / 7 ore / 2 L
    (new.id, 'steps', 'Passi', 'voto', 'score_1_5', 'daily', 1, 5, 'footprints',
       'Quanto ti sei avvicinato oggi al tuo obiettivo di passi?', 60, 8000, 'passi'),
    (new.id, 'sleep', 'Sonno', 'voto', 'score_1_5', 'daily', 1, 5, 'moon',
       'Come hai dormito stanotte rispetto al tuo obiettivo?', 70, 7, 'ore'),
    (new.id, 'water', 'Acqua', 'voto', 'score_1_5', 'daily', 1, 5, 'glass-water',
       'Quanta acqua hai bevuto oggi rispetto al tuo obiettivo?', 80, 2, 'L'),
    (new.id, 'workouts', 'Allenamenti', 'voto', 'score_1_10', 'per_session', 1, 10, 'dumbbell',
       'Voto alla qualità/performance dell''allenamento', 90, null, null)
  on conflict (studio_id, key) do nothing;
  return new;
end;
$$;

-- Studi esistenti: "Gluteo" diventa "Fianchi" e si aggiungono peso e
-- spalle. La chiave resta circ_glutes: guard_metric_update non la cambia per
-- una misura con registrazioni (e la chiave non si mostra all'utente).
update public.metrics
   set name = 'Circ. Fianchi'
 where key = 'circ_glutes' and name = 'Circ. Gluteo';

insert into public.metrics
  (studio_id, key, name, unit, value_type, frequency, min_value, max_value, icon, instructions, sort_order)
select s.id, v.key, v.name, v.unit, 'decimal', 'monthly_30d', v.min_value, v.max_value, v.icon, v.instructions, v.sort_order
  from public.studios s
 cross join (values
   ('weight',         'Peso',         'kg', 20::numeric, 300::numeric, 'weight', 'Ogni 30 giorni inseriscilo qui', 1),
   ('circ_shoulders', 'Circ. Spalle', 'cm', 10,          250,          'ruler',  'Ogni 30 giorni inseriscila qui', 5)
 ) as v(key, name, unit, min_value, max_value, icon, instructions, sort_order)
on conflict (studio_id, key) do nothing;
