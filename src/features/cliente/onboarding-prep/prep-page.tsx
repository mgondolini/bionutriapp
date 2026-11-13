import { Camera, Check, Lock, Pencil } from "lucide-react";
import Link from "next/link";

import { PhotoFrame } from "@/components/shared/photos/photo-slot";
import { PhotoProgress } from "@/components/shared/photos/photo-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { PHOTO_VIEWS, PREP_TASKS, ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureText } from "@/lib/domain/tracking/labels";
import { formatLongDate } from "@/lib/format";
import { callWhenText, weekdayText } from "@/lib/onboarding-prep/labels";
import { prepDeadline } from "@/lib/onboarding-prep/reminders";
import { cn } from "@/lib/utils";
import type { PrepView } from "@/server/services/onboarding-prep.service";
import type { PhotoSetView } from "@/server/services/photos.service";

import {
  PrepBadge,
  dayOf,
  measuresSummary,
  photosBadge,
  timeOf,
} from "./prep-parts";

const t = copy.onboardingPrep;
const p = copy.photos;

/** In alto: data della chiamata e avanzamento (C28) o "Tutto pronto" (C31). */
function Hero({ prep, studioName }: { prep: PrepView; studioName: string }) {
  const { status } = prep;
  const deadline = prep.call
    ? ` ${t.deadlineSentence(weekdayText(prepDeadline(prep.call.date)))}`
    : "";
  return (
    <section
      aria-labelledby="prep-hero"
      className="flex flex-col gap-3 rounded-[20px] bg-mint p-5 text-foreground"
    >
      <span className="w-fit rounded-full bg-foreground px-2.5 py-0.5 text-[12.5px] font-bold text-mint">
        {status.complete ? t.ready.tag : t.callLabel}
      </span>
      <h2
        id="prep-hero"
        className="text-[21px] leading-tight font-bold tracking-tight"
      >
        {status.complete
          ? t.ready.title
          : prep.call
            ? callWhenText(prep.call.date, prep.call.time)
            : t.title}
      </h2>
      <p className="rounded-xl bg-white/60 px-3.5 py-3 text-sm leading-5">
        {status.complete
          ? t.ready.description
          : prep.call
            ? `${t.callIntro(studioName)}${deadline}`
            : t.noCallDate}
      </p>
      <PhotoProgress count={status.done} total={PREP_TASKS.length} onMint />
      <p className="text-[13px] font-semibold">
        {t.tasksSent(status.done, PREP_TASKS.length)}
      </p>
    </section>
  );
}

function MeasuresCard({ prep }: { prep: PrepView }) {
  const done = prep.status.measures === "done";
  return (
    <section
      aria-labelledby="prep-measures"
      className={cn(
        "flex flex-col gap-3 rounded-[20px] bg-card p-4",
        done ? "border border-admin-line" : "border-2 border-warm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="prep-measures" className="text-[15px] font-bold">
            {t.measures.title}
          </h2>
          <span className="text-[13px] text-admin-muted">
            {done && prep.measures.sentAt && prep.status.complete
              ? t.measures.sentOn(
                  dayOf(prep.measures.sentAt),
                  timeOf(prep.measures.sentAt),
                )
              : measuresSummary(prep)}
          </span>
        </div>
        <PrepBadge state={prep.status.measures} />
      </div>
      {done && prep.status.complete ? (
        <dl className="flex flex-col divide-y divide-admin-line rounded-[14px] border border-admin-line">
          {prep.measures.items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
            >
              <dt>{item.name}</dt>
              <dd className="font-semibold tabular-nums">
                {item.value === null
                  ? t.admin.noValue
                  : measureText(item.value, item.unit)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <Link
        href={ROUTES.client.prepMeasures}
        className={cn(
          buttonVariants({ variant: done ? "outline" : "default", size: "lg" }),
          "w-full",
        )}
      >
        {done ? <Pencil aria-hidden="true" strokeWidth={1.8} /> : null}
        {done
          ? prep.status.complete
            ? t.measures.correct
            : t.measures.review
          : t.measures.start}
      </Link>
    </section>
  );
}

function PhotosCard({
  prep,
  set,
}: {
  prep: PrepView;
  set: PhotoSetView | null;
}) {
  const saved = prep.status.photos === "saved";
  const alt = (view: (typeof PHOTO_VIEWS)[number]) =>
    set ? p.alt(p.viewsLower[view], set.label, formatLongDate(set.date)) : "";
  return (
    <section
      aria-labelledby="prep-photos"
      className={cn(
        "flex flex-col gap-3 rounded-[20px] bg-card p-4",
        saved ? "border border-admin-line" : "border-2 border-warm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="prep-photos" className="text-[15px] font-bold">
            {t.photos.title}
          </h2>
          <span className="text-[13px] text-admin-muted">
            {saved && prep.photos.savedAt
              ? t.photos.savedOn(
                  dayOf(prep.photos.savedAt),
                  timeOf(prep.photos.savedAt),
                )
              : t.photos.summary}
          </span>
        </div>
        {photosBadge(prep)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PHOTO_VIEWS.map((view) => {
          const photo = set?.photos.find((item) => item.view === view);
          return (
            <PhotoFrame
              key={view}
              view={view}
              url={photo?.url ?? null}
              alt={photo ? alt(view) : ""}
              locked={saved}
            />
          );
        })}
      </div>
      <p className="text-[13px] text-admin-muted">
        {saved ? t.photos.locked : t.photos.why}
      </p>
      {saved ? null : set ? (
        <Link
          href={ROUTES.client.prepPhotos}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <Camera aria-hidden="true" strokeWidth={1.8} />
          {prep.photos.count > 0 ? t.photos.continue : t.photos.start}
        </Link>
      ) : (
        <p className="rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
          {t.photosPage.noSession}
        </p>
      )}
    </section>
  );
}

/** Cosa succede dopo, quando è tutto inviato (C31). */
function NextSteps({ prep }: { prep: PrepView }) {
  const steps = [
    { title: t.ready.nextReview, description: t.ready.nextReviewWhen },
    {
      title: t.ready.nextCall,
      description: prep.call
        ? callWhenText(prep.call.date, prep.call.time)
        : t.noCallDate,
    },
  ];
  return (
    <section aria-labelledby="prep-next" className="flex flex-col gap-3">
      <h2 id="prep-next" className="text-[17px] font-bold">
        {t.ready.nextTitle}
      </h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-center gap-3.5 rounded-[14px] border bg-card p-3.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold",
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground text-background",
              )}
            >
              {index === 0 ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="flex flex-col">
              <span className="text-[14.5px] font-bold">{step.title}</span>
              <span className="text-[13px] text-muted-foreground">
                {step.description}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Pagina "Prepara la chiamata" (C28), riepilogo quando è tutto inviato (C31). */
export function PrepPage({
  prep,
  set,
  studioName,
}: {
  prep: PrepView;
  set: PhotoSetView | null;
  studioName: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Hero prep={prep} studioName={studioName} />
      <MeasuresCard prep={prep} />
      <PhotosCard prep={prep} set={set} />
      {prep.status.complete ? <NextSteps prep={prep} /> : null}
      <p className="flex items-start gap-2 text-[13px] leading-5 text-admin-muted">
        <Lock
          aria-hidden="true"
          strokeWidth={1.8}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{t.privacy}</span>
      </p>
    </div>
  );
}
