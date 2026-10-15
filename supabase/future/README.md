# Migrazioni future (NON applicate)

I file di questa cartella **non** vengono letti da `supabase db reset` né da `supabase db push`: la CLI applica solo `supabase/migrations`. Il test `supabase/tests/01_rls_enabled.sql` verifica che non siano stati applicati.

| File                   | Versione | Contenuto                                                                  |
| ---------------------- | -------- | -------------------------------------------------------------------------- |
| `v2_appuntamenti.sql`  | 2.0      | Tabella `appointments`, passaggio automatico a "In percorso" (CAL-14), RLS |
| `v3_collaboratori.sql` | 3.0      | Ruolo `collaborator`, `clients.assigned_to`, permessi differenziati        |

## Al rilascio di una versione

1. Spostare il file in `supabase/migrations` con un timestamp successivo all'ultima migrazione applicata (es. `pnpm supabase migration new v2_appuntamenti` e incollare il contenuto).
2. Aggiornare il test `01_rls_enabled.sql` (elenco tabelle, controlli sui file futuri) e aggiungere i test della versione.
3. `pnpm supabase db reset`, `pnpm db:test`, `pnpm db:types`.

La v2.0 deve ancora definire le tabelle per la disponibilità e il collegamento iCal (CAL-07…CAL-12).
