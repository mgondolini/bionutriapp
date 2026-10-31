import { OpenFileButton } from "@/components/shared/open-file-button";
import { copy } from "@/lib/copy/it";

/** "Apri PDF" e "Scarica" di un file in evidenza (C-02, C-04), sulla card nel colore dello studio. */
export function FileButtons({ id, title }: { id: string; title: string }) {
  return (
    <>
      <OpenFileButton
        fileId={id}
        title={title}
        mode="view"
        label={copy.files.open}
        variant="inverse"
        icon="eye"
      />
      <OpenFileButton
        fileId={id}
        title={title}
        mode="download"
        label={copy.files.download}
        variant="inverse-outline"
      />
    </>
  );
}
