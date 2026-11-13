-- Preparazione della chiamata di onboarding: misure di partenza (tutte le
-- misure mensili, salvate insieme, corrette senza doppioni, limiti e data),
-- accesso del cliente in Onboarding limitato a misure e set di partenza,
-- stato per lo staff, candidati dei promemoria, misure ritrovate nel
-- Tracking dopo il passaggio a In percorso.
begin;
select plan(22);
select tests.create_fixtures();

-- c6 (Onboarding, utente u6): chiamata fra 2 giorni, check 3 oggi
select public.create_client_journey(tests.id('c6'), null, 'first', 6::smallint,
  private.today_rome() - 90, (private.today_rome() - 90 + interval '6 months')::date,
  true, 'none',
  (select jsonb_agg(jsonb_build_object(
            'position', p,
            'type', case when p = 0 then 'onboarding' else 'check' end,
            'calculated_date', case when p = 0 then private.today_rome() + 2
                                    else private.today_rome() - 90 + p * 30 end))
     from generate_series(0, 5) p));

create function pg_temp.session(p_position int) returns uuid language sql security definer as $$
  select id from public.journey_sessions where client_id = tests.id('c6') and position = p_position;
$$;
create function pg_temp.values_of(p_value numeric) returns jsonb language sql security definer as $$
  select jsonb_object_agg(key, p_value) from public.metrics
   where studio_id = tests.id('studio1') and frequency = 'monthly_30d' and is_active;
$$;
create function pg_temp.monthly_total() returns int language sql security definer as $$
  select count(*)::int from public.metrics
   where studio_id = tests.id('studio1') and frequency = 'monthly_30d' and is_active;
$$;
create function pg_temp.entries_of_c6() returns int language sql security definer as $$
  select count(*)::int from public.tracking_entries t
    join public.metrics m on m.id = t.metric_id
   where t.client_id = tests.id('c6') and m.frequency = 'monthly_30d';
$$;

select ok(pg_temp.monthly_total() = 7, 'le misure di partenza sono tutte le mensili: peso e 6 circonferenze');

-- ---------------------------------------------------------------------
-- Misure di partenza
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('u6'));
select lives_ok(
  format('select public.save_onboarding_measures(%L, %L)', private.today_rome() - 1, pg_temp.values_of(50)),
  'il cliente in Onboarding manda tutte le misure insieme'
);
select is(pg_temp.entries_of_c6(), 7, 'una registrazione per misura (la vita già presente è stata corretta)');
select is(
  (select count(*)::int from public.tracking_entries where created_by_role = 'client'), 7,
  'le legge, scritte come del cliente'
);
select lives_ok(
  format('select public.save_onboarding_measures(%L, %L)', private.today_rome(), pg_temp.values_of(60)),
  'le corregge'
);
select is(pg_temp.entries_of_c6(), 7, 'la correzione non crea doppioni');
select is(
  (select count(*)::int from public.tracking_entries where value = 60 and recorded_on = private.today_rome()), 7,
  'valori e data aggiornati'
);
select throws_ok(
  format('select public.save_onboarding_measures(%L, %L)', private.today_rome(),
         pg_temp.values_of(60) - 'weight'),
  '23514', 'Manca la misura weight', 'servono tutte le misure'
);
select throws_ok(
  format('select public.save_onboarding_measures(%L, %L)', private.today_rome() + 1, pg_temp.values_of(60)),
  '23514', 'La data non può essere nel futuro', 'data non futura'
);
select throws_ok(
  format('select public.save_onboarding_measures(%L, %L)', private.today_rome(), pg_temp.values_of(5)),
  null, null, 'valori fuori dai limiti del Tracking rifiutati'
);
select is_empty(
  $$ select 1 from public.tracking_entries where client_id <> tests.id('c6') $$,
  'nessuna registrazione di altri clienti'
);
select throws_ok(
  format($$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
            values (%L, %L, 3, %L) $$,
         tests.id('c6'), tests.metric_id(tests.id('studio1'), 'water'), private.today_rome()),
  '42501', null, 'in Onboarding nessuna abitudine: solo le misure di partenza'
);

-- ---------------------------------------------------------------------
-- Foto: in Onboarding solo il set di partenza, aperto subito
-- ---------------------------------------------------------------------
select tests.clear_authentication();
update public.journey_sessions set custom_date = private.today_rome() + 30 where id = pg_temp.session(0);
select tests.authenticate_as(tests.id('u6'));
select lives_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(0)),
  'il set di partenza si apre subito, anche con la chiamata fra 30 giorni'
);
select throws_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(3)),
  '42501', null, 'in Onboarding il cliente non apre il set del check 3, anche se è il giorno'
);

-- ---------------------------------------------------------------------
-- Stato della preparazione
-- ---------------------------------------------------------------------
select is(
  (select (measures_done, measures_total, photos_status, call_date)::text from public.my_onboarding_prep()),
  (7, 7, 'draft', private.today_rome() + 30)::text,
  'il cliente legge il proprio stato: misure complete, foto in bozza, data della chiamata'
);
select tests.clear_authentication();
update public.journey_sessions set custom_date = private.today_rome() + 2 where id = pg_temp.session(0);

select tests.authenticate_as(tests.id('owner1'));
select is(
  (select measures_done from public.onboarding_prep_status where client_id = tests.id('c6')), 7,
  'lo staff vede lo stato dei propri clienti'
);
select tests.authenticate_as(tests.id('owner2'));
select is_empty(
  $$ select 1 from public.onboarding_prep_status where client_id = tests.id('c6') $$,
  'lo staff di un altro studio no'
);
select tests.clear_authentication();

select results_eq(
  format($$ select client_id, measures_missing, photos_missing
              from public.onboarding_prep_candidates(%L, %L, %L) $$,
         tests.id('studio1'), private.today_rome() + 1, private.today_rome() + 2),
  $$ values (tests.id('c6'), false, true) $$,
  'promemoria: manca solo il set di foto'
);
select is_empty(
  format($$ select 1 from public.onboarding_prep_candidates(%L, %L, %L) $$,
         tests.id('studio1'), private.today_rome() + 3, private.today_rome() + 4),
  'nessun promemoria fuori dalla finestra'
);
select throws_ok(
  format($$ select public.onboarding_prep_candidates(%L, %L, %L) $$,
         tests.id('studio1'), current_date, current_date),
  '42501', null, 'candidati solo con la secret key'
) from (select tests.authenticate_as(tests.id('owner1'))) x;
select tests.clear_authentication();

-- ---------------------------------------------------------------------
-- Dopo il passaggio a In percorso le misure restano nel Tracking
-- ---------------------------------------------------------------------
update public.clients set journey_stage = 'in_progress' where id = tests.id('c6');
select tests.authenticate_as(tests.id('u6'));
select is(
  (select count(*)::int from public.tracking_entries t join public.metrics m on m.id = t.metric_id
    where m.frequency = 'monthly_30d'),
  7, 'In percorso il cliente ritrova le misure di partenza nel Tracking'
);
select throws_ok(
  format('select public.save_onboarding_measures(%L, %L)', private.today_rome(), pg_temp.values_of(70)),
  '42501', null, 'fuori dall''Onboarding le misure di partenza non si mandano più'
);

select * from finish();
rollback;
