"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";

import { FormMessage } from "@/components/shared/form-message";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";
import { fitZoom, isCropUpscaled, type CropArea } from "@/lib/logo/crop";
import { cn } from "@/lib/utils";

import { drawLogo, exportLogo, imageSize } from "./render-logo";

const t = copy.admin.settings.crop;

type CropMode = "fill" | "fit";
const MODES: CropMode[] = ["fill", "fit"];
const MAX_ZOOM = 4;
/** Lato del PNG usato solo per le anteprime. */
const PREVIEW_SIZE = 192;

/** Immagine scelta, già caricata e abbastanza grande. */
export type LogoSource = { url: string; image: HTMLImageElement };

/** Anteprima in miniatura come nel menu, nell'icona Android e su iPhone. */
function Previews({ url }: { url: string | null }) {
  const items = [
    {
      label: t.previewMenu,
      // menu laterale scuro: logo su card bianca, angoli arrotondati
      frame: "bg-sidebar p-2.5",
      tile: "size-9 rounded-[10px]",
      inset: "p-0",
    },
    {
      label: t.previewAndroid,
      // icona maskable: cerchio, logo nel 60% centrale (padding 0.2)
      frame: "bg-muted p-2",
      tile: "size-16 rounded-full",
      inset: "p-[20%]",
    },
    {
      label: t.previewIphone,
      // apple-touch-icon: quadrato arrotondato, padding 0.1
      frame: "bg-muted p-2",
      tile: "size-16 rounded-[22%]",
      inset: "p-[10%]",
    },
  ];
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold">
        {t.previewTitle}
      </figcaption>
      <ul className="flex flex-wrap items-end gap-4">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex items-center justify-center rounded-xl",
                item.frame,
              )}
            >
              <span
                className={cn(
                  "flex overflow-hidden bg-white",
                  item.tile,
                  item.inset,
                )}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL locale
                  <img src={url} alt="" className="size-full object-contain" />
                ) : null}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/**
 * Ritaglio del logo (A-14): area quadrata con zoom, "Riempi" o "Adatta con
 * margine" (l'area può superare l'immagine e il resto resta bianco), anteprime
 * dal vivo. Alla conferma restituisce il PNG quadrato da caricare.
 * Chi lo usa gli dà `key` = URL dell'immagine: con un nuovo file lo stato
 * riparte da "Riempi" centrato.
 */
export function LogoCropDialog({
  source,
  onCancel,
  onConfirm,
}: {
  source: LogoSource | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const [mode, setMode] = useState<CropMode>("fill");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const minFit = source ? fitZoom(imageSize(source.image)) : 1;
  const minZoom = mode === "fill" ? 1 : minFit;

  // anteprima in piccolo dopo ogni spostamento
  useEffect(() => {
    if (!source || !area) return;
    const frame = requestAnimationFrame(() => {
      setPreview(drawLogo(source.image, area, PREVIEW_SIZE).toDataURL());
    });
    return () => cancelAnimationFrame(frame);
  }, [source, area]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  function chooseMode(next: CropMode) {
    setMode(next);
    setCrop({ x: 0, y: 0 });
    setZoom(next === "fill" ? 1 : minFit);
  }

  async function confirm() {
    if (!source || !area) return;
    setPending(true);
    setFailed(false);
    try {
      onConfirm(await exportLogo(source.image, area));
    } catch (error) {
      console.error("Ritaglio del logo non riuscito", error);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <ResponsiveDialog
      open={source !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t.title}
      description={t.description}
      dialogClassName="sm:max-w-xl"
    >
      {source ? (
        <div className="flex flex-col gap-5">
          {/* fondo bianco come nel PNG finale (Adatta con margine) */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-white">
            <Cropper
              image={source.url}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={1}
              showGrid={false}
              // il quadrato occupa tutto il riquadro: a zoom 1 è il lato corto
              objectFit="cover"
              restrictPosition={mode === "fill"}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropperProps={{ "aria-label": t.areaLabel }}
              style={{
                containerStyle: { background: "#ffffff" },
                cropAreaStyle: { border: 0, color: "transparent" },
              }}
              classes={{
                // focus visibile per spostare l'immagine con le frecce
                cropAreaClassName:
                  "outline-none focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:ring-inset",
              }}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">
              {t.modeLabel}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODES.map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer gap-3 rounded-xl border border-line-strong bg-card p-3 has-checked:border-primary has-checked:bg-primary-tint has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name="logo-crop-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => chooseMode(value)}
                    className="mt-0.5 size-4 accent-(--primary)"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {value === "fill" ? t.fill : t.fit}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {value === "fill" ? t.fillHint : t.fitHint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t.zoom}</span>
            <input
              type="range"
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-11 w-full accent-(--primary)"
            />
          </label>

          <Previews url={preview} />

          {area && isCropUpscaled(area) ? (
            <p
              role="status"
              className="rounded-xl bg-warning px-3.5 py-3 text-sm text-warning-foreground"
            >
              {t.upscaled(Math.round(area.width))}
            </p>
          ) : null}

          {failed ? <FormMessage>{t.failed}</FormMessage> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button onClick={confirm} disabled={!area || pending}>
              {pending ? t.rendering : t.confirm}
            </Button>
          </div>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
