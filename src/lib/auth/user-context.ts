/**
 * Interpretazione delle righe restituite dalla RPC `my_context()` (funzione pura,
 * condivisa da proxy e session.service). Il ruolo arriva sempre dal database.
 */
import { STAFF_ROLES, type StaffRole } from "@/lib/constants/domain";

export type ContextRow = {
  role: string;
  studio_id: string;
  studio_slug: string;
  client_id: string | null;
};

export type UserContext =
  | { kind: "none" }
  | { kind: "staff"; role: StaffRole; studioId: string; studioSlug: string }
  | { kind: "client"; studioId: string; studioSlug: string; clientId: string }
  | {
      kind: "client_disabled";
      studioId: string;
      studioSlug: string;
      clientId: string;
    };

function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Sceglie il contesto dell'utente: un professionista prevale su un cliente,
 * un cliente attivo su uno disattivato. Nessuna riga = utente senza ruolo.
 */
export function resolveUserContext(rows: readonly ContextRow[]): UserContext {
  const staff = rows.find((row) => isStaffRole(row.role));
  if (staff && isStaffRole(staff.role)) {
    return {
      kind: "staff",
      role: staff.role,
      studioId: staff.studio_id,
      studioSlug: staff.studio_slug,
    };
  }

  for (const kind of ["client", "client_disabled"] as const) {
    const row = rows.find((r) => r.role === kind && r.client_id);
    if (row?.client_id) {
      return {
        kind,
        studioId: row.studio_id,
        studioSlug: row.studio_slug,
        clientId: row.client_id,
      };
    }
  }

  return { kind: "none" };
}
