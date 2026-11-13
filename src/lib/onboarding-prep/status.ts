/**
 * Stato della preparazione della chiamata (C28, C31, A1, A5): due attività,
 * misure di partenza e foto di partenza. Le misure sono fatte quando ogni
 * misura mensile ha almeno una registrazione (anche inserita dal
 * nutrizionista); le foto quando il set di partenza è salvato.
 */
import { PREP_TASKS, type PrepTask } from "@/lib/constants/domain";

export type PrepPhotosState = "todo" | "draft" | "saved";

export type PrepStatus = {
  measures: "todo" | "done";
  photos: PrepPhotosState;
  /** Attività fatte, da 0 a 2. */
  done: number;
  complete: boolean;
  /** Cosa manca, nell'ordine misure, foto. */
  missing: PrepTask[];
};

export function getPrepStatus(input: {
  measuresDone: number;
  measuresTotal: number;
  photosStatus: "draft" | "saved" | null;
  photosCount: number;
}): PrepStatus {
  const measures =
    input.measuresTotal > 0 && input.measuresDone >= input.measuresTotal
      ? "done"
      : "todo";
  const photos: PrepPhotosState =
    input.photosStatus === "saved"
      ? "saved"
      : input.photosCount > 0
        ? "draft"
        : "todo";
  const missing = PREP_TASKS.filter((task) =>
    task === "measures" ? measures !== "done" : photos !== "saved",
  );
  return {
    measures,
    photos,
    done: PREP_TASKS.length - missing.length,
    complete: missing.length === 0,
    missing,
  };
}
