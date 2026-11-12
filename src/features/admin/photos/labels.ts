import { shortWhen } from "@/components/shared/photos/labels";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import type { PhotoItem, PhotoSetView } from "@/server/services/photos.service";

const t = copy.photos;
const a = copy.photos.admin;

/** Chi ha caricato: il nome del cliente o "Studio". */
export function whoOf(photo: PhotoItem, firstName: string) {
  return photo.uploadedByRole === "client" ? firstName : a.studio;
}

export function captionOf(photo: PhotoItem | undefined, firstName: string) {
  if (!photo) return t.notYetUploaded;
  return photo.uploadedByRole === "client"
    ? a.uploadedBy(firstName, shortWhen(photo.uploadedAt))
    : a.uploadedByStudio(shortWhen(photo.uploadedAt));
}

export function altOf(set: PhotoSetView) {
  return (photo: PhotoItem) =>
    t.alt(t.viewsLower[photo.view], set.label, formatLongDate(set.date));
}
