import axios from "axios";
import { Axios } from "@/lib/axios";
import { apiErrorMessage } from "@/lib/auth/errors";

// CSV exports of a list (leads, contacts). The API applies the same filters as
// the list and the caller's access, writes an audit entry, and refuses more
// than 10,000 rows with EXPORT_TOO_LARGE.

export type ExportParams = Record<string, string | undefined>;

// Only filters that are set go in the query, so the file matches the screen.
export const exportQuery = (params: ExportParams): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""),
  );

const fileNameFrom = (disposition: string | undefined, fallback: string) => {
  const match = disposition ? /filename="?([^";]+)"?/i.exec(disposition) : null;
  return match ? match[1] : fallback;
};

// A failed blob request carries its JSON error body as a Blob; read it back so
// the error code can be turned into plain words.
const withJsonBody = async (error: unknown) => {
  if (!axios.isAxiosError(error) || !(error.response?.data instanceof Blob)) return error;
  try {
    const body = JSON.parse(await error.response.data.text());
    return { ...error, response: { ...error.response, data: body } };
  } catch {
    return error;
  }
};

export const exportErrorMessage = (error: unknown) => apiErrorMessage(error, "The export didn't work. Please try again.");

// Downloads the file through the browser. Throws with the error body readable.
export const downloadExport = async (path: string, params: ExportParams, fallbackName: string) => {
  try {
    const response = await Axios.get(path, { params: exportQuery(params), responseType: "blob" });
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFrom(response.headers?.["content-disposition"], fallbackName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw await withJsonBody(error);
  }
};
