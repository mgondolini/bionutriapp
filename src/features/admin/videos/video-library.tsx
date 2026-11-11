"use client";

import {
  Clapperboard,
  ExternalLink,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { VideoThumbnail } from "@/components/shared/video-thumbnail";
import { Button } from "@/components/ui/button";
import { ROUTES, adminVideoFolderUrl } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { youtubeShortLabel, youtubeWatchUrl } from "@/lib/videos/youtube";
import {
  deleteFolderAction,
  deleteVideoAction,
  reorderFoldersAction,
  reorderVideosAction,
} from "@/server/actions/videos.actions";
import type {
  AdminFolder,
  AdminFolderNode,
  AdminVideo,
  VideoLibrary as VideoLibraryData,
} from "@/server/services/videos.service";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { FolderDialog, type FolderDialogMode } from "./folder-dialog";
import { SortableList } from "./sortable-list";
import { VideoDialog, type VideoDialogMode } from "./video-dialog";

const t = copy.admin.videos;

/** Chip dell'area admin (mockup v4): testo Profondo, fondo per significato. */
function Chip({
  tone,
  children,
}: {
  tone: "video" | "neutral" | "onboarding" | "new" | "wash" | "warning";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs leading-[18px] font-semibold whitespace-nowrap text-foreground",
        {
          video: "bg-video",
          neutral: "bg-admin-hover text-admin-muted",
          onboarding: "border-[1.5px] border-admin-field bg-card px-[9px]",
          new: "bg-mint",
          wash: "bg-wash",
          warning: "bg-warning font-bold",
        }[tone],
      )}
    >
      {children}
    </span>
  );
}

function FolderTile({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-video text-video-ink",
        {
          sm: "size-8 rounded-[10px]",
          md: "size-10 rounded-xl",
          lg: "size-12 rounded-xl",
        }[size],
      )}
    >
      <Folder className={size === "lg" ? "size-6" : "size-5"} />
    </span>
  );
}

/**
 * Libreria video dello staff (mockup v4, A13): cartelle e sottocartelle a
 * sinistra, riordinabili; a destra i video della cartella scelta
 * (`?cartella=`), riordinabili, con modifica ed eliminazione.
 */
export function VideoLibrary({ library }: { library: VideoLibraryData }) {
  const router = useRouter();
  const [folderDialog, setFolderDialog] = useState<FolderDialogMode | null>(
    null,
  );
  const [videoDialog, setVideoDialog] = useState<VideoDialogMode | null>(null);
  const selected = library.selected;
  const hasFolders = library.tree.length > 0;

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="neutral"
              onClick={() => setFolderDialog({ kind: "create", parent: null })}
            >
              <FolderPlus aria-hidden="true" />
              {t.newFolder}
            </Button>
            {hasFolders ? (
              <Button
                variant="action"
                onClick={() =>
                  setVideoDialog({
                    kind: "add",
                    folderId: selected?.folder.id ?? null,
                  })
                }
              >
                <Plus aria-hidden="true" />
                {t.addVideo}
              </Button>
            ) : null}
          </div>
        }
      />

      {hasFolders ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <FolderPanel
            library={library}
            selectedId={selected?.folder.id ?? null}
          />
          {selected ? (
            <FolderContent
              selected={selected}
              hasChildren={
                (library.tree.find((f) => f.id === selected.folder.id)?.children
                  .length ?? 0) > 0
              }
              onEditFolder={() =>
                setFolderDialog({
                  kind: "edit",
                  folder: selected.folder,
                  parent: selected.parent,
                })
              }
              onNewSubfolder={() =>
                setFolderDialog({
                  kind: "create",
                  parent: {
                    id: selected.folder.id,
                    name: selected.folder.name,
                  },
                })
              }
              onAddVideo={() =>
                setVideoDialog({ kind: "add", folderId: selected.folder.id })
              }
              onEditVideo={(video) => setVideoDialog({ kind: "edit", video })}
              onFolderDeleted={() =>
                router.push(
                  selected.parent
                    ? adminVideoFolderUrl(selected.parent.id)
                    : ROUTES.admin.videos,
                )
              }
            />
          ) : null}
        </div>
      ) : (
        <EmptyState
          icon={Clapperboard}
          title={t.noFolders.title}
          description={t.noFolders.description}
          className="rounded-[20px] border-admin-line"
          iconClassName="size-[72px] rounded-[22px] bg-video-tint text-video-ink"
          action={
            <Button
              variant="action"
              onClick={() => setFolderDialog({ kind: "create", parent: null })}
            >
              <FolderPlus aria-hidden="true" />
              {t.newFolder}
            </Button>
          }
        />
      )}

      {folderDialog ? (
        <FolderDialog
          // un form nuovo per ogni apertura: valori iniziali sempre giusti
          key={JSON.stringify(folderDialog)}
          mode={folderDialog}
          open
          onOpenChange={(open) => {
            if (!open) setFolderDialog(null);
          }}
        />
      ) : null}
      {videoDialog ? (
        <VideoDialog
          key={JSON.stringify(videoDialog)}
          mode={videoDialog}
          folders={library.folderOptions}
          open
          onOpenChange={(open) => {
            if (!open) setVideoDialog(null);
          }}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------
// Cartelle
// ---------------------------------------------------------------------

function FolderPanel({
  library,
  selectedId,
}: {
  library: VideoLibraryData;
  selectedId: string | null;
}) {
  return (
    <section
      aria-labelledby="video-folders-title"
      className="flex flex-col gap-1.5 rounded-[20px] border border-admin-line bg-card px-3.5 py-5 lg:w-[340px] lg:shrink-0 lg:self-start"
    >
      <div className="flex items-baseline justify-between gap-3 px-1.5 pb-2">
        <h2 id="video-folders-title" className="text-[17px] font-bold">
          {t.foldersTitle}
        </h2>
        <span className="text-xs font-medium text-admin-muted">
          {t.foldersSummary(library.folderCount, library.videoCount)}
        </span>
      </div>
      <SortableList
        items={library.tree}
        label={t.foldersListLabel}
        className="flex flex-col gap-1"
        save={(ids) => reorderFoldersAction({ parentId: null, ids })}
        renderItem={(folder, handle) => (
          <FolderItem folder={folder} selectedId={selectedId} handle={handle} />
        )}
      />
      <p className="px-1.5 pt-2.5 text-xs font-medium text-admin-muted">
        {t.reorderFoldersHint}
      </p>
    </section>
  );
}

function FolderRow({
  folder,
  selected,
  handle,
  sub,
}: {
  folder: AdminFolder;
  selected: boolean;
  handle: ReactNode;
  sub?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-[14px] border-[1.5px] py-1 pr-3 pl-1.5",
        selected
          ? "border-video bg-video-tint"
          : "border-transparent hover:bg-admin-row-hover",
      )}
    >
      {handle}
      <Link
        href={adminVideoFolderUrl(folder.id)}
        aria-current={selected ? "page" : undefined}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <FolderTile size={sub ? "sm" : "md"} />
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate leading-5 font-bold",
              sub ? "text-sm" : "text-[14.5px]",
            )}
          >
            {folder.name}
          </span>
          <span className="text-xs font-medium text-admin-muted">
            {t.videoCount(folder.videoCount)}
          </span>
          {!sub && folder.visibleInOnboarding ? (
            <span className="mt-1">
              <Chip tone="onboarding">{t.onboardingBadge}</Chip>
            </span>
          ) : null}
        </span>
      </Link>
    </div>
  );
}

function FolderItem({
  folder,
  selectedId,
  handle,
}: {
  folder: AdminFolderNode;
  selectedId: string | null;
  handle: ReactNode;
}) {
  return (
    <>
      <FolderRow
        folder={folder}
        selected={folder.id === selectedId}
        handle={handle}
      />
      {folder.children.length > 0 ? (
        <SortableList
          items={folder.children}
          label={t.subfoldersListLabel(folder.name)}
          className="mt-1 ml-5 flex flex-col gap-1 border-l-2 border-admin-line pl-2"
          save={(ids) => reorderFoldersAction({ parentId: folder.id, ids })}
          renderItem={(child, childHandle) => (
            <FolderRow
              folder={child}
              selected={child.id === selectedId}
              handle={childHandle}
              sub
            />
          )}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------
// Cartella scelta e video
// ---------------------------------------------------------------------

type Selected = NonNullable<VideoLibraryData["selected"]>;

function FolderContent({
  selected,
  hasChildren,
  onEditFolder,
  onNewSubfolder,
  onAddVideo,
  onEditVideo,
  onFolderDeleted,
}: {
  selected: Selected;
  hasChildren: boolean;
  onEditFolder: () => void;
  onNewSubfolder: () => void;
  onAddVideo: () => void;
  onEditVideo: (video: AdminVideo) => void;
  onFolderDeleted: () => void;
}) {
  const { folder, parent, videos } = selected;
  const isSubfolder = Boolean(folder.parentId);
  const deleteBlocked =
    videos.length > 0 || hasChildren ? t.deleteFolderDialog.notEmpty : null;

  return (
    <section
      aria-labelledby="video-folder-title"
      className="@container min-w-0 flex-1 overflow-hidden rounded-[20px] border border-admin-line bg-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <FolderTile size="lg" />
          <div className="flex min-w-0 flex-col">
            {parent ? (
              <span className="text-xs font-semibold text-admin-muted">
                {t.parentLabel(parent.name)}
              </span>
            ) : null}
            <h2
              id="video-folder-title"
              className="text-xl leading-[26px] font-bold tracking-tight"
            >
              {folder.name}
            </h2>
            {folder.description ? (
              <p className="mt-0.5 text-[13px] text-admin-muted">
                {folder.description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip tone="video">{t.videoCount(folder.videoCount)}</Chip>
              <Chip tone="neutral">
                {folder.onboarding
                  ? t.visibleTo.onboarding
                  : t.visibleTo.active}
              </Chip>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="neutral" size="sm" onClick={onEditFolder}>
            <Pencil aria-hidden="true" />
            {t.editFolder}
          </Button>
          {isSubfolder ? null : (
            <Button variant="neutral" size="sm" onClick={onNewSubfolder}>
              <FolderPlus aria-hidden="true" />
              {t.newSubfolder}
            </Button>
          )}
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t.deleteFolder}
                className="text-admin-muted hover:bg-admin-hover"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            }
            title={t.deleteFolderDialog.title(folder.name)}
            description={t.deleteFolderDialog.description}
            blocked={deleteBlocked}
            cancel={t.deleteFolderDialog.cancel}
            confirm={t.deleteFolderDialog.confirm}
            done={t.deleteFolderDialog.deleted}
            onConfirm={() => deleteFolderAction({ folderId: folder.id })}
            onDone={onFolderDeleted}
          />
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="border-t border-admin-line p-6">
          <EmptyState
            icon={Clapperboard}
            title={t.emptyFolder.title}
            description={t.emptyFolder.description}
            className="border-admin-line"
            iconClassName="size-[72px] rounded-[22px] bg-video-tint text-video-ink"
            action={
              <Button variant="action" onClick={onAddVideo}>
                <Plus aria-hidden="true" />
                {t.addVideo}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden items-center gap-3.5 border-t border-admin-line bg-admin-hover px-5 py-2.5 text-xs font-semibold text-admin-muted @3xl:grid @3xl:grid-cols-[28px_minmax(0,1fr)_92px_104px_96px]"
          >
            <span />
            <span>{t.table.video}</span>
            <span>{t.table.addedOn}</span>
            <span>{t.table.openedBy}</span>
            <span />
          </div>
          <SortableList
            items={videos.map((video) => ({ ...video, name: video.title }))}
            label={t.videosListLabel(folder.name)}
            save={(ids) => reorderVideosAction({ folderId: folder.id, ids })}
            renderItem={(video, handle) => (
              <VideoRow
                video={video}
                handle={handle}
                onEdit={() => onEditVideo(video)}
              />
            )}
          />
          <p className="border-t border-admin-line px-6 py-3.5 text-xs font-medium text-admin-muted">
            {t.table.footer(videos.length)}
          </p>
        </>
      )}
    </section>
  );
}

function VideoRow({
  video,
  handle,
  onEdit,
}: {
  video: AdminVideo;
  handle: ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 border-t border-admin-line bg-card px-5 py-3 hover:bg-admin-row-hover @3xl:grid-cols-[28px_minmax(0,1fr)_92px_104px_96px]">
      {handle}
      <div className="flex min-w-0 items-center gap-3.5">
        <VideoThumbnail youtubeId={video.youtubeId} className="w-[104px]" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="leading-5 font-semibold">
            {video.title}
            {video.recent ? (
              <span className="ml-2 align-middle">
                <Chip tone="new">{t.table.newBadge}</Chip>
              </span>
            ) : null}
            {video.unavailableAt ? (
              <span className="ml-2 align-middle">
                <Chip tone="warning">{t.table.unavailable}</Chip>
              </span>
            ) : null}
          </span>
          <a
            href={youtubeWatchUrl(video.youtubeId)}
            target="_blank"
            rel="noopener noreferrer"
            title={t.actions.openOnYoutube}
            className="inline-flex items-center gap-1 self-start truncate text-xs font-medium text-admin-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            {youtubeShortLabel(video.youtubeId)}
            <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </div>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-2 @3xl:contents">
        <span className="text-sm">
          <span className="sr-only">{t.table.addedOn} </span>
          {formatShortDate(video.createdAt)}
        </span>
        <span>
          <span className="sr-only">{t.table.openedBy} </span>
          <Chip tone="wash">{t.table.openedCount(video.openedBy)}</Chip>
        </span>
        <div className="ml-auto flex items-center justify-end gap-1">
          <Button
            variant="neutral"
            size="icon"
            aria-label={t.actions.editFor(video.title)}
            title={t.actions.edit}
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="neutral"
                size="icon"
                aria-label={t.actions.deleteFor(video.title)}
                title={t.actions.delete}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            }
            title={copy.admin.videos.deleteVideoDialog.title(video.title)}
            description={copy.admin.videos.deleteVideoDialog.description}
            cancel={copy.admin.videos.deleteVideoDialog.cancel}
            confirm={copy.admin.videos.deleteVideoDialog.confirm}
            done={copy.admin.videos.deleteVideoDialog.deleted}
            onConfirm={() => deleteVideoAction({ videoId: video.id })}
          />
        </div>
      </div>
    </div>
  );
}
