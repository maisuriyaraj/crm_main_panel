// How dates are shown in the panel. The API always sends and stores ISO 8601, so
// the choice lives here and nowhere else: pass a value through `formatDate` and it
// comes out in the organization's chosen order.
//
// `useDateFormat` in hooks/useDateFormat.ts is the way screens read the current
// choice; these functions take it as an argument so they stay pure and usable
// outside React.

export const DATE_FORMATS = ["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"] as const;

export type DateFormat = (typeof DATE_FORMATS)[number];

export const DEFAULT_DATE_FORMAT: DateFormat = "DD-MM-YYYY";

// What each choice looks like, for the picker. The example is a real date put
// through the same function, so the label can never drift from the behaviour.
const EXAMPLE = new Date(Date.UTC(2026, 2, 9));

export const isDateFormat = (value: unknown): value is DateFormat =>
    typeof value === "string" && (DATE_FORMATS as readonly string[]).includes(value);

export const asDateFormat = (value: unknown): DateFormat => (isDateFormat(value) ? value : DEFAULT_DATE_FORMAT);

const parse = (value: string | Date | null | undefined): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (value: number) => String(value).padStart(2, "0");

// A plain date (an invoice's issue date, for example) arrives as "2026-03-09" with
// no time. Reading it in the viewer's time zone can land on the day before, so a
// date-only value is taken apart as written instead of through a Date.
const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsOf = (value: string | Date | null | undefined): { year: string; month: string; day: string } | null => {
    if (typeof value === "string") {
        const written = dateOnly.exec(value.trim());
        if (written) return { year: written[1], month: written[2], day: written[3] };
    }
    const date = parse(value);
    if (!date) return null;
    return { year: String(date.getFullYear()), month: pad(date.getMonth() + 1), day: pad(date.getDate()) };
};

/** A date in the organization's chosen order, or `fallback` when there is none. */
export const formatDate = (
    value: string | Date | null | undefined,
    format: DateFormat = DEFAULT_DATE_FORMAT,
    fallback = "—",
): string => {
    const parts = partsOf(value);
    if (!parts) return fallback;
    const { year, month, day } = parts;
    if (format === "MM-DD-YYYY") return `${month}-${day}-${year}`;
    if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
    return `${day}-${month}-${year}`;
};

/** The same, with the time of day after it. Only for a value that carries a time. */
export const formatDateTime = (
    value: string | Date | null | undefined,
    format: DateFormat = DEFAULT_DATE_FORMAT,
    fallback = "—",
): string => {
    const date = parse(value);
    if (!date) return fallback;
    return `${formatDate(date, format, fallback)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** "09-03-2026", for the format picker's options. */
export const dateFormatExample = (format: DateFormat) => formatDate(EXAMPLE, format);
