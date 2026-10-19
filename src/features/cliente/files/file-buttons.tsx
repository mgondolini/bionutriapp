import { OpenFileButton } from "@/components/shared/open-file-button";
import { copy } from "@/lib/copy/it";

/** "Apri PDF" e "Scarica" di un file in evidenza (C-02, C-04). */
export function FileButtons({ id, title }: { id: string; title: string }) {
  return (
    <>
      <OpenFileButton
        fileId={id}
        title={title}
        mode="view"
        label={copy.files.open}
      />
      <OpenFileButton
        fileId={id}
        title={title}
        mode="download"
        label={copy.files.download}
      />
    </>
  );
}
