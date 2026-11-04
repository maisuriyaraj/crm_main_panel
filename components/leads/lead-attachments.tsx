"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { format } from "date-fns";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";

import { resolveOwnerName, type LeadOwner } from "@/lib/leads/types";
import {
  ACCEPT_ATTRIBUTE,
  checkFileBeforeUpload,
  describeUploadError,
  formatBytes,
  isStorageFull,
  openAttachment,
  storageFullMessage,
  type LeadAttachment,
} from "@/lib/leads/attachments";
import {
  reqToDeleteLeadAttachment,
  reqToGetLeadAttachments,
  reqToGetStorageUsage,
  reqToUploadLeadAttachment,
} from "@/lib/store/slices/leadAttachmentsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { notify } from "@/lib/commonFunctions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LeadAttachmentsProps {
  leadId: string;
  owners: LeadOwner[];
  // Both follow leads.update, which the API checks for upload and delete.
  canUpload: boolean;
  canDelete: boolean;
}

export function LeadAttachments({ leadId, owners, canUpload, canDelete }: LeadAttachmentsProps) {
  const dispatch = useAppDispatch();
  const { leadId: loadedFor, items, isLoading, error, usage } = useAppSelector((state) => state.leadAttachments);
  const shown = loadedFor === leadId ? items : [];

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LeadAttachment | null>(null);

  const load = () => dispatch(reqToGetLeadAttachments({ data: { leadId } }));
  const refreshUsage = () => dispatch(reqToGetStorageUsage({}));

  // The sheet keys this component by lead, so its own state starts fresh for each one.
  useEffect(() => {
    load();
    refreshUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const upload = (file: File) => {
    const problem = checkFileBeforeUpload(file, usage);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError(null);
    setProgress(0);
    dispatch(
      reqToUploadLeadAttachment({
        data: { leadId, file, onProgress: setProgress },
        onSuccess: () => {
          setProgress(null);
          notify(`${file.name} attached`, { type: "success" });
          refreshUsage();
        },
        onFailure: async (failure: unknown) => {
          setProgress(null);
          if (isStorageFull(failure)) {
            // Fresh numbers, so the message shows what is really used now.
            const result = await refreshUsage();
            const fresh = reqToGetStorageUsage.fulfilled.match(result) ? result.payload : usage;
            setUploadError(fresh ? storageFullMessage(fresh, file.size) : describeUploadError(failure));
            return;
          }
          setUploadError(describeUploadError(failure));
        },
      })
    );
  };

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setUploadError("Add one file at a time.");
      return;
    }
    upload(files[0]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (progress === null) pick(event.dataTransfer.files);
  };

  const download = async (attachment: LeadAttachment) => {
    setOpening(attachment.id);
    try {
      await openAttachment(leadId, attachment.id);
    } catch {
      notify("The file could not be opened. Please try again.", { type: "error" });
    } finally {
      setOpening(null);
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    dispatch(
      reqToDeleteLeadAttachment({
        data: { leadId, attachmentId: target.id },
        onSuccess: () => {
          notify(`${target.fileName} deleted`, { type: "success" });
          refreshUsage();
        },
        onFailure: () => notify("The file could not be deleted. Please try again.", { type: "error" }),
      })
    );
  };

  const uploading = progress !== null;

  return (
    <div className="space-y-3">
      {usage && usage.limitBytes > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Storage: {formatBytes(usage.usedBytes)} of {formatBytes(usage.limitBytes)} used ({usage.percentUsed}%)
          </p>
          <Progress value={Math.min(usage.percentUsed, 100)} aria-label="Storage used" />
        </div>
      )}

      {canUpload && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "space-y-2 rounded-md border border-dashed border-border p-3 text-center",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => {
              pick(event.target.files);
              event.target.value = "";
            }}
          />
          {uploading ? (
            <div className="space-y-1">
              <p className="text-sm">Uploading... {progress}%</p>
              <Progress value={progress} aria-label="Upload progress" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Drop a file here, or</p>
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Choose a file
              </Button>
              <p className="text-xs text-muted-foreground">Images, MP4 or WebM video, PDF or Word. Up to 10 MB, or 90 MB for video.</p>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          {uploadError}
        </p>
      )}

      {isLoading && shown.length === 0 ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="space-y-2 text-sm">
          <p className="text-destructive">The files could not be loaded.</p>
          <Button size="sm" variant="outline" onClick={load}>Try again</Button>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={attachment.fileName}>{attachment.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(attachment.bytes)} · {resolveOwnerName(owners, attachment.uploadedBy)} · {format(new Date(attachment.createdAt), "d MMM yyyy")}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Download ${attachment.fileName}`}
                disabled={opening === attachment.id}
                onClick={() => download(attachment)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {canDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={`Delete ${attachment.fileName}`}
                  onClick={() => setPendingDelete(attachment)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.fileName} will be removed from this lead for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
