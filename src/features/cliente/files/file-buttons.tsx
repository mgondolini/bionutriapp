import { OpenFileButton } from "@/components/shared/open-file-button";
import type { FileCategory } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

/**
 * "Apri PDF" e "Scarica" di un file in evidenza (C-02, C-04): sulla card menta
 * delle diete il secondario ha il bordo Profondo, sulle card bianche è il
 * normale `outline`.
 */
export function FileButtons({
  id,
  title,
  category,
}: {
  id: string;
  title: string;
  category: FileCategory;
}) {
  return (
    <>
      <OpenFileButton
        fileId={id}
        title={title}
        mode="view"
        label={copy.files.open}
        variant="default"
        icon="eye"
      />
      <OpenFileButton
        fileId={id}
        title={title}
        mode="download"
        label={copy.files.download}
        variant={category === "diet" ? "mint-outline" : "outline"}
      />
    </>
  );
}
