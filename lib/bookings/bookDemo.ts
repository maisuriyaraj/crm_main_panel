import * as Yup from "yup";
import { TEAM_SIZES } from "@/lib/types/booking";
import type { AvailabilityDay, BookingApiError, BookingRequest, TeamSize } from "@/lib/types/booking";

// Everything the Book a Demo form needs that isn't markup: its rules (which
// mirror the backend's publicCreateBookingSchema field for field), the
// request it sends, and how server errors map back onto its fields.

export interface BookDemoValues {
    fullName: string;
    businessEmail: string;
    businessName: string;
    teamSize: TeamSize | "";
    phoneNumber: string;
    preferredDate: string;
    preferredSlot: string;
    meetingType: "virtual" | "onsite";
    message: string;
    website: string;
}

export const initialBookDemoValues: BookDemoValues = {
    fullName: "",
    businessEmail: "",
    businessName: "",
    teamSize: "",
    phoneNumber: "",
    preferredDate: "",
    preferredSlot: "",
    meetingType: "virtual",
    message: "",
    website: "",
};

export const MESSAGE_MAX = 2000;

// `slots` are the instants the server offered for the chosen date; a slot is
// only valid if it is one of them, so a stale page can't send an old time.
// The server refuses control characters (line breaks, tabs, ...) in single-line names.
const NO_CONTROL_CHARS = /^[^\p{Cc}]*$/u;

export const bookDemoSchema = (slots: string[]) =>
    Yup.object({
        fullName: Yup.string().trim().required("Full name is required").min(2, "Full name must be at least 2 characters").max(100, "Full name is too long")
            .matches(NO_CONTROL_CHARS, "Full name contains invalid characters"),
        businessEmail: Yup.string().trim().required("Work email is required").email("Enter a valid email").max(254, "Email is too long"),
        businessName: Yup.string().trim().required("Business name is required").min(2, "Business name must be at least 2 characters").max(120, "Business name is too long")
            .matches(NO_CONTROL_CHARS, "Business name contains invalid characters"),
        teamSize: Yup.string().required("Please select your team size").oneOf([...TEAM_SIZES], "Please select your team size"),
        phoneNumber: Yup.string().trim().max(20, "Phone number is too long")
            .matches(/^\+?[0-9][0-9\s-]{6,19}$/, { message: "Enter a valid phone number", excludeEmptyString: true }),
        preferredDate: Yup.string().required("Choose a date"),
        preferredSlot: Yup.string().required("Choose a time").oneOf(slots, "Choose one of the available times"),
        meetingType: Yup.string().oneOf(["virtual", "onsite"]),
        message: Yup.string().trim().max(MESSAGE_MAX, "Message is too long"),
    });

export const visitorTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
};

// Blank optional fields are left out entirely (the API stores them as NULL),
// and the slot is sent exactly as the server offered it.
export const buildBookingRequest = (values: BookDemoValues, timezone: string): BookingRequest => {
    const request: BookingRequest = {
        full_name: values.fullName.trim(),
        email: values.businessEmail.trim().toLowerCase(),
        organization_name: values.businessName.trim(),
        team_members_count: values.teamSize as TeamSize,
        scheduled_at: values.preferredSlot,
        timezone,
        meeting_type: values.meetingType,
    };
    if (values.phoneNumber.trim()) request.mobile = values.phoneNumber.trim();
    if (values.message.trim()) request.business_requirements = values.message.trim();
    if (values.website) request.website = values.website;
    return request;
};

const FIELD_FROM_API: Record<string, keyof BookDemoValues> = {
    full_name: "fullName",
    email: "businessEmail",
    organization_name: "businessName",
    team_members_count: "teamSize",
    mobile: "phoneNumber",
    scheduled_at: "preferredSlot",
    timezone: "preferredSlot",
    meeting_type: "meetingType",
    business_requirements: "message",
};

export type BookingOutcome =
    | { kind: "fields"; fieldErrors: Partial<Record<keyof BookDemoValues, string>> }
    | { kind: "duplicate"; message: string }
    | { kind: "slot"; fieldErrors: Partial<Record<keyof BookDemoValues, string>> }
    | { kind: "rate_limited"; message: string }
    | { kind: "other"; message: string };

export const interpretBookingError = (error: BookingApiError): BookingOutcome => {
    if (error.code === "DUPLICATE_OPEN_BOOKING") {
        return { kind: "duplicate", message: error.message };
    }
    if (error.status === 429) {
        return { kind: "rate_limited", message: "Too many attempts. Please try again later." };
    }
    const fieldErrors: Partial<Record<keyof BookDemoValues, string>> = {};
    for (const e of error.errors ?? []) {
        const field = e.field ? FIELD_FROM_API[e.field] : undefined;
        if (field && !fieldErrors[field]) fieldErrors[field] = e.message;
    }
    if (error.code === "SLOT_NOT_ALLOWED") {
        return { kind: "slot", fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : { preferredSlot: error.message } };
    }
    if (Object.keys(fieldErrors).length) return { kind: "fields", fieldErrors };
    return { kind: "other", message: error.message || "Something went wrong. Please try again." };
};

// ─── Labels in the visitor's own timezone ───────────────────────────────────

export const formatSlotTime = (iso: string, timezone: string): string =>
    new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(iso));

// Availability dates are already the visitor's calendar dates; format them as
// plain dates (in UTC) so the label can't shift by a day.
export const formatDayLabel = (date: string): string =>
    new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

export const formatBookedTime = (iso: string, timezone: string): string =>
    new Intl.DateTimeFormat(undefined, {
        weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
        timeZone: timezone, timeZoneName: "short",
    }).format(new Date(iso));

export const daysWithSlots = (days: AvailabilityDay[]): AvailabilityDay[] => days.filter((d) => d.slots.length > 0);

// Today's calendar date for the visitor, as YYYY-MM-DD.
export const todayInZone = (timezone: string, now: Date = new Date()): string => {
    const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
};

// Calendar arithmetic on a YYYY-MM-DD string (done in UTC, so DST can't skip a day).
export const addDays = (date: string, days: number): string => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
