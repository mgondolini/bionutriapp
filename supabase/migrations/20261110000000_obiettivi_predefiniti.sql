-- =====================================================================
-- Obiettivi predefiniti delle abitudini, confermati dal nutrizionista:
-- 10.000 passi, 8 ore di sonno, 2 L di acqua (prima 8.000 / 7 / 2).
--
--   * seed_default_metrics: valori per i nuovi studi (resto invariato).
--   * Studi esistenti: si aggiornano solo i default ancora uguali ai
--     vecchi valori, così un obiettivo già cambiato dallo studio resta.
--     Gli obiettivi personali dei clienti (client_metric_goals) non si
--     toccano; chi non ne ha uno segue il nuovo default.
-- =====================================================================

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
    -- obiettivi predefiniti confermati: 10.000 passi / 8 ore / 2 L
    (new.id, 'steps', 'Passi', 'voto', 'score_1_5', 'daily', 1, 5, 'footprints',
       'Quanto ti sei avvicinato oggi al tuo obiettivo di passi?', 60, 10000, 'passi'),
    (new.id, 'sleep', 'Sonno', 'voto', 'score_1_5', 'daily', 1, 5, 'moon',
       'Come hai dormito stanotte rispetto al tuo obiettivo?', 70, 8, 'ore'),
    (new.id, 'water', 'Acqua', 'voto', 'score_1_5', 'daily', 1, 5, 'glass-water',
       'Quanta acqua hai bevuto oggi rispetto al tuo obiettivo?', 80, 2, 'L'),
    (new.id, 'workouts', 'Allenamenti', 'voto', 'score_1_10', 'per_session', 1, 10, 'dumbbell',
       'Voto alla qualità/performance dell''allenamento', 90, null, null)
  on conflict (studio_id, key) do nothing;
  return new;
end;
$$;

update public.metrics set default_goal = 10000 where key = 'steps' and default_goal = 8000;
update public.metrics set default_goal = 8     where key = 'sleep' and default_goal = 7;
