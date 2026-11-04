import axios from "axios";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";

export interface LeadAttachment {
  id: string;
  leadId: string;
  fileName: string;
  fileType: "image" | "video" | "document";
  mime: string;
  bytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface StorageUsage {
  usedBytes: number;
  files: number;
  limitBytes: number;
  percentUsed: number;
  limitSource: "plan" | "platform_default";
}

// What the API sends, before mapping.
interface ApiAttachment {
  id: number | string;
  lead_id: number | string;
  file_name: string;
  file_type: LeadAttachment["fileType"];
  mime: string;
  bytes: number | string;
  uploaded_by: number | string | null;
  created_at: string;
}

interface ApiStorageUsage {
  used_bytes?: number;
  files?: number;
  limit_bytes?: number;
  percent_used?: number;
  limit_source?: StorageUsage["limitSource"];
}

export const mapAttachmentFromApi = (raw: ApiAttachment): LeadAttachment => ({
  id: String(raw.id),
  leadId: String(raw.lead_id),
  fileName: raw.file_name,
  fileType: raw.file_type,
  mime: raw.mime,
  bytes: Number(raw.bytes) || 0,
  uploadedBy: raw.uploaded_by != null ? String(raw.uploaded_by) : "",
  createdAt: raw.created_at,
});

export const mapStorageUsageFromApi = (raw: ApiStorageUsage): StorageUsage => ({
  usedBytes: Number(raw.used_bytes) || 0,
  files: Number(raw.files) || 0,
  limitBytes: Number(raw.limit_bytes) || 0,
  percentUsed: Number(raw.percent_used) || 0,
  limitSource: raw.limit_source ?? "platform_default",
});

const MB = 1024 * 1024;

// A copy of the API's file types and default size limits
// (crm_backend/src/services/file-storage/file-types.js and settings). It only
// saves a wasted upload: the API checks the file's real bytes, and a Master
// Admin can change the limits there, so the API's answer always wins.
export const ATTACHMENT_TYPES = {
  image: { extensions: ["jpg", "jpeg", "png", "gif", "webp"], maxBytes: 10 * MB },
  video: { extensions: ["mp4", "m4v", "webm"], maxBytes: 90 * MB },
  document: { extensions: ["pdf", "docx"], maxBytes: 10 * MB },
} as const;

export type AttachmentCategory = keyof typeof ATTACHMENT_TYPES;

export const ACCEPTED_EXTENSIONS = Object.values(ATTACHMENT_TYPES).flatMap((type) => [...type.extensions]);

// For the file picker's `accept`, so the dialog offers only what the API takes.
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

const UNITS = ["bytes", "KB", "MB", "GB", "TB"];

// Same rounding as the API's own messages, so the two never disagree on screen.
export const formatBytes = (bytes: number) => {
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
};

const extensionOf = (name: string) => {
  const match = /\.([A-Za-z0-9]+)$/.exec(name);
  return match ? match[1].toLowerCase() : null;
};

export const categoryOf = (name: string): AttachmentCategory | null => {
  const extension = extensionOf(name);
  if (!extension) return null;
  const entry = (Object.entries(ATTACHMENT_TYPES) as [AttachmentCategory, (typeof ATTACHMENT_TYPES)[AttachmentCategory]][])
    .find(([, type]) => (type.extensions as readonly string[]).includes(extension));
  return entry ? entry[0] : null;
};

// `usage` is optional: when known, a file that cannot fit is stopped here too.
export const checkFileBeforeUpload = (file: { name: string; size: number }, usage?: StorageUsage | null): string | null => {
  if (!file.size) return "This file is empty.";
  const category = categoryOf(file.name);
  if (!category) {
    return "This type of file can't be attached. Use an image (JPG, PNG, GIF, WebP), a video (MP4, WebM), a PDF or a Word document (DOCX).";
  }
  const { maxBytes } = ATTACHMENT_TYPES[category];
  if (file.size > maxBytes) {
    return `This file is ${formatBytes(file.size)}. The largest ${category} you can attach is ${formatBytes(maxBytes)}.`;
  }
  if (usage && usage.limitBytes > 0 && usage.usedBytes + file.size > usage.limitBytes) {
    return storageFullMessage(usage, file.size);
  }
  return null;
};

export const storageFullMessage = (usage: StorageUsage, fileBytes?: number) => {
  const left = Math.max(usage.limitBytes - usage.usedBytes, 0);
  const need = fileBytes ? `This file needs ${formatBytes(fileBytes)}, but only ${formatBytes(left)} is left. ` : "";
  return `Your organization's file storage is full: ${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)} used (${usage.percentUsed}%). ${need}Delete files you no longer need, or ask your admin about a larger plan.`;
};

const STORAGE_FULL = "STORAGE_QUOTA_EXCEEDED";

export const isStorageFull = (error: unknown) =>
  axios.isAxiosError(error) && (error.response?.data as { code?: string } | undefined)?.code === STORAGE_FULL;

// Plain words for anything an upload can answer. The storage-limit message is
// built from fresh usage when we have it, so it shows the real numbers.
export const describeUploadError = (error: unknown, usage?: StorageUsage | null, fileBytes?: number) => {
  if (!axios.isAxiosError(error)) return "The file could not be uploaded. Please try again.";
  if (!error.response) return "The upload did not reach the server. Check your connection and try again.";
  const { status } = error.response;
  const data = (error.response.data ?? {}) as { code?: string; message?: string };
  if (data.code === STORAGE_FULL) {
    return usage ? storageFullMessage(usage, fileBytes) : data.message || "Your organization's file storage is full.";
  }
  if (data.code === "FEATURE_DISABLED") return "File uploads are not available on your plan.";
  if (status === 403) return "You don't have permission to add files to this lead.";
  if (status === 413) return data.message || "This file is too large.";
  if (status === 415) return data.message || "This type of file can't be attached.";
  if (status === 422) return "The storage service refused this file. It may be damaged.";
  if (status === 429) return "Too many uploads at once. Wait a minute and try again.";
  if (status >= 500) return "File storage is not available right now. Please try again in a few minutes.";
  return data.message || "The file could not be uploaded.";
};

const attachmentsPath = (leadId: string) => `${apiRoutes.leads}/${leadId}/attachments`;

export const fetchAttachments = async (leadId: string) => {
  const response = await Axios.get(attachmentsPath(leadId));
  return ((response.data?.data ?? []) as ApiAttachment[]).map(mapAttachmentFromApi);
};

export const uploadAttachment = async (leadId: string, file: File, onProgress?: (percent: number) => void) => {
  const form = new FormData();
  form.append("file", file);
  const response = await Axios.post(attachmentsPath(leadId), form, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return mapAttachmentFromApi(response.data?.data);
};

export const deleteAttachment = async (leadId: string, attachmentId: string) => {
  await Axios.delete(`${attachmentsPath(leadId)}/${attachmentId}`);
};

export const fetchStorageUsage = async () => {
  const response = await Axios.get(apiRoutes.storageUsage);
  return mapStorageUsageFromApi(response.data?.data ?? {});
};

// A signed link works for minutes and lets anyone holding it download the file,
// so it is asked for on every click and handed straight to the browser: never
// returned, put in state or storage, or written into the page. The API serves it
// as a download, so the panel stays where it is.
export const openAttachment = async (
  leadId: string,
  attachmentId: string,
  open: (url: string) => void = (url) => window.location.assign(url),
) => {
  const response = await Axios.get(`${attachmentsPath(leadId)}/${attachmentId}/download`);
  open(response.data.data.url);
};
