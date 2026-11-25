-- Peso e circonferenze dello staff anche con una data futura (fino a un
-- anno); il cliente, le abitudini e gli allenamenti restano a "non futura".
begin;
select plan(6);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80,
       private.today_rome() + 3) $$,
  'lo staff registra una circonferenza con una data futura'
);
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'weight'), 75,
       private.today_rome() + 365) $$,
  'lo staff registra il peso fino a un anno da oggi'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'weight'), 75,
       private.today_rome() + 366) $$,
  '23514', null, 'oltre un anno la data viene rifiutata'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'water'), 3,
       private.today_rome() + 1) $$,
  '23514', null, 'un voto di un''abitudine dello staff resta non futuro'
);

select tests.authenticate_as(tests.id('u1'));
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80,
       private.today_rome() + 1) $$,
  '23514', null, 'il cliente non registra una circonferenza nel futuro'
);
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80,
       private.today_rome()) $$,
  'il cliente registra la circonferenza di oggi'
);

select * from finish();
rollback;
