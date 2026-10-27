"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Formik, Form, useFormikContext, type FormikHelpers } from "formik";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqBookingAvailability, reqToCreateBooking } from "@/lib/store/slices/publicAPisSlice";
import { notify } from "@/lib/commonFunctions";
import { TEAM_SIZES } from "@/lib/types/booking";
import type { AvailabilityDay, BookingAck, BookingApiError } from "@/lib/types/booking";
import {
    MESSAGE_MAX,
    addDays,
    bookDemoSchema,
    buildBookingRequest,
    daysWithSlots,
    formatBookedTime,
    formatDayLabel,
    formatSlotTime,
    initialBookDemoValues,
    interpretBookingError,
    todayInZone,
    visitorTimezone,
    type BookDemoValues,
} from "@/lib/bookings/bookDemo";

// Used only until the first availability answer says what the server allows.
const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_HORIZON_DAYS = 60;
const FIELD_ORDER: (keyof BookDemoValues)[] = ["fullName", "businessEmail", "businessName", "teamSize", "phoneNumber", "preferredDate", "preferredSlot", "message"];

const inputClass = "rounded-xl px-4 py-3 h-auto";

function FieldError({ name, message }: { name: string; message?: string }) {
    if (!message) return null;
    return (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-500">
            {message}
        </p>
    );
}

function FieldShell({ name, label, children }: { name: keyof BookDemoValues; label: string; children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode }) {
    const { errors, touched } = useFormikContext<BookDemoValues>();
    const message = touched[name] ? (errors[name] as string | undefined) : undefined;
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={name}>{label}</Label>
            {children({ id: name, "aria-invalid": !!message, "aria-describedby": message ? `${name}-error` : undefined })}
            <FieldError name={name} message={message} />
        </div>
    );
}

function TextField({ name, label, type = "text", autoComplete, placeholder }: { name: keyof BookDemoValues; label: string; type?: string; autoComplete?: string; placeholder?: string }) {
    const { values, handleChange, handleBlur } = useFormikContext<BookDemoValues>();
    return (
        <FieldShell name={name} label={label}>
            {(a11y) => (
                <Input {...a11y} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} value={values[name] as string} onChange={handleChange} onBlur={handleBlur} className={inputClass} />
            )}
        </FieldShell>
    );
}

function SelectField({ name, label, placeholder, options, disabled }: { name: keyof BookDemoValues; label: string; placeholder: string; options: { value: string; label: string }[]; disabled?: boolean }) {
    const { values, setFieldValue, setFieldTouched } = useFormikContext<BookDemoValues>();
    return (
        <FieldShell name={name} label={label}>
            {(a11y) => (
                <Select
                    value={(values[name] as string) || undefined}
                    disabled={disabled}
                    onValueChange={(value) => setFieldValue(name, value)}
                    onOpenChange={(open) => { if (!open) setFieldTouched(name, true, false); }}
                >
                    <SelectTrigger {...a11y} className={`${inputClass} bg-background`}>
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </FieldShell>
    );
}

// Moves focus to the first field with an error after a failed submit, so
// keyboard and screen-reader users land where the problem is.
function FocusFirstError() {
    const { submitCount, isSubmitting, errors } = useFormikContext<BookDemoValues>();
    useEffect(() => {
        if (submitCount === 0 || isSubmitting) return;
        const first = FIELD_ORDER.find((f) => errors[f]);
        if (first) document.getElementById(first)?.focus();
    }, [submitCount, isSubmitting, errors]);
    return null;
}

// Clears the chosen time when the date changes, so a time from another day is never sent.
function ResetSlotOnDateChange() {
    const { values, setFieldValue } = useFormikContext<BookDemoValues>();
    const previous = useRef(values.preferredDate);
    useEffect(() => {
        if (previous.current !== values.preferredDate) {
            previous.current = values.preferredDate;
            setFieldValue("preferredSlot", "", false);
        }
    }, [values.preferredDate, setFieldValue]);
    return null;
}

type Done = { kind: "booked"; ack: BookingAck } | { kind: "duplicate"; message: string };

function Confirmation({ done, timezone }: { done: Done; timezone: string }) {
    return (
        <div className="mt-8 flex flex-col items-start gap-4" role="status" aria-live="polite">
            <CheckCircle2 className="size-10 text-primary" aria-hidden />
            {done.kind === "booked" ? (
                <>
                    <h2 className="text-2xl font-bold">Request received</h2>
                    <p className="text-muted-foreground">
                        Your demo request for <strong className="text-foreground">{formatBookedTime(done.ack.scheduled_at, timezone)}</strong> is in.
                    </p>
                    <p className="text-muted-foreground">
                        Reference: <span className="font-mono text-foreground">{done.ack.reference}</span>
                    </p>
                    <p className="text-muted-foreground">Our team will contact you to confirm the time and send the meeting details.</p>
                </>
            ) : (
                <>
                    <h2 className="text-2xl font-bold">We already have your request</h2>
                    <p className="text-muted-foreground">{done.message}</p>
                </>
            )}
            <Button asChild variant="outline" size="lg">
                <Link href="/">Back to home</Link>
            </Button>
        </div>
    );
}

export default function BookDemoForm() {
    const dispatch = useAppDispatch();
    const timezone = useMemo(() => visitorTimezone(), []);
    const [days, setDays] = useState<AvailabilityDay[]>([]);
    const [windowEnd, setWindowEnd] = useState<string | null>(null);
    const [slotsState, setSlotsState] = useState<"loading" | "ready" | "error">("loading");
    const [done, setDone] = useState<Done | null>(null);
    const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW_DAYS);
    const [horizonDays, setHorizonDays] = useState(DEFAULT_HORIZON_DAYS);

    const rememberLimits = useCallback((availability: { max_range_days?: number; max_horizon_days?: number }) => {
        if (availability.max_range_days) setWindowDays(availability.max_range_days);
        if (availability.max_horizon_days) setHorizonDays(availability.max_horizon_days);
    }, []);

    // Loads one window of dates (in the visitor's calendar) and appends it.
    // State only changes once the request settles; callers that want a loading
    // indicator set it themselves (see reload below).
    const loadWindow = useCallback(async (from: string, replace = false) => {
        const to = addDays(from, windowDays - 1);
        const action = await dispatch(reqBookingAvailability({ data: { from, to, timezone } }));
        if (reqBookingAvailability.fulfilled.match(action)) {
            setDays((prev) => (replace ? action.payload.days : [...prev, ...action.payload.days]));
            setWindowEnd(to);
            rememberLimits(action.payload);
            setSlotsState("ready");
        } else {
            setSlotsState("error");
        }
    }, [dispatch, timezone, windowDays, rememberLimits]);

    const today = useMemo(() => todayInZone(timezone), [timezone]);
    // First window of dates on mount; a late answer after unmount is ignored.
    useEffect(() => {
        let active = true;
        const to = addDays(today, DEFAULT_WINDOW_DAYS - 1);
        dispatch(reqBookingAvailability({ data: { from: today, to, timezone } })).then((action) => {
            if (!active) return;
            if (reqBookingAvailability.fulfilled.match(action)) {
                setDays(action.payload.days);
                setWindowEnd(to);
                rememberLimits(action.payload);
                setSlotsState("ready");
            } else {
                setSlotsState("error");
            }
        });
        return () => {
            active = false;
        };
    }, [dispatch, today, timezone, rememberLimits]);

    const reload = (from: string, replace = false) => {
        setSlotsState("loading");
        loadWindow(from, replace);
    };

    const bookableDays = daysWithSlots(days);
    const canLoadMore = !!windowEnd && windowEnd < addDays(today, horizonDays);

    const onSubmit = async (values: BookDemoValues, helpers: FormikHelpers<BookDemoValues>) => {
        const action = await dispatch(reqToCreateBooking({ data: buildBookingRequest(values, timezone) }));
        if (reqToCreateBooking.fulfilled.match(action)) {
            setDone({ kind: "booked", ack: action.payload });
            return;
        }
        const outcome = interpretBookingError(action.payload as BookingApiError);
        if (outcome.kind === "duplicate") {
            setDone({ kind: "duplicate", message: outcome.message });
        } else if (outcome.kind === "fields" || outcome.kind === "slot") {
            for (const [field, message] of Object.entries(outcome.fieldErrors)) {
                helpers.setFieldTouched(field, true, false);
                helpers.setFieldError(field, message);
            }
            if (outcome.kind === "slot") reload(today, true);
        } else {
            notify(outcome.message, { type: "error" });
        }
    };

    if (done) return <Confirmation done={done} timezone={timezone} />;

    return (
        <Formik<BookDemoValues>
            initialValues={initialBookDemoValues}
            validationSchema={() => bookDemoSchema(bookableDays.flatMap((d) => d.slots))}
            onSubmit={onSubmit}
        >
            {({ values, isSubmitting, handleChange, handleBlur, errors, touched }) => {
                const day = bookableDays.find((d) => d.date === values.preferredDate);
                return (
                    <Form className="mt-8 space-y-4" noValidate aria-describedby="book-demo-timezone">
                        <FocusFirstError />
                        <ResetSlotOnDateChange />
                        <TextField name="fullName" label="Full name" autoComplete="name" />
                        <TextField name="businessEmail" label="Work email" type="email" autoComplete="email" />
                        <TextField name="businessName" label="Business name" autoComplete="organization" />
                        <SelectField name="teamSize" label="Team size" placeholder="Select team size" options={TEAM_SIZES.map((t) => ({ value: t, label: t.replace("-", " – ") }))} />
                        <TextField name="phoneNumber" label="Phone (optional)" type="tel" autoComplete="tel" />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <SelectField
                                name="preferredDate"
                                label="Preferred date"
                                placeholder={slotsState === "loading" && !bookableDays.length ? "Loading dates…" : "Choose a date"}
                                disabled={!bookableDays.length}
                                options={bookableDays.map((d) => ({ value: d.date, label: formatDayLabel(d.date) }))}
                            />
                            <SelectField
                                name="preferredSlot"
                                label="Preferred time"
                                placeholder={values.preferredDate ? "Choose a time" : "Pick a date first"}
                                disabled={!day}
                                options={(day?.slots ?? []).map((s) => ({ value: s, label: formatSlotTime(s, timezone) }))}
                            />
                        </div>
                        <p id="book-demo-timezone" className="text-sm text-muted-foreground">
                            Times shown in {timezone} (your device&apos;s timezone).
                        </p>
                        {slotsState === "error" && (
                            <p role="alert" className="text-sm text-red-500">
                                Couldn&apos;t load available times.{" "}
                                <button type="button" className="underline" onClick={() => reload(today, true)}>
                                    Retry
                                </button>
                            </p>
                        )}
                        {canLoadMore && slotsState !== "error" && (
                            <button type="button" className="text-sm text-primary underline disabled:opacity-60" disabled={slotsState === "loading"} onClick={() => windowEnd && reload(addDays(windowEnd, 1))}>
                                {slotsState === "loading" ? "Loading…" : "Show later dates"}
                            </button>
                        )}

                        <fieldset className="flex flex-col gap-1.5">
                            <legend className="mb-1.5 text-sm font-medium">Meeting</legend>
                            <div className="flex gap-6 text-sm">
                                {(["virtual", "onsite"] as const).map((type) => (
                                    <label key={type} className="flex items-center gap-2">
                                        <input type="radio" name="meetingType" value={type} checked={values.meetingType === type} onChange={handleChange} />
                                        {type === "virtual" ? "Online" : "In person"}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="message">What would you like to see? (optional)</Label>
                            <Textarea
                                id="message"
                                name="message"
                                rows={3}
                                maxLength={MESSAGE_MAX}
                                value={values.message}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                aria-invalid={!!(touched.message && errors.message)}
                                aria-describedby={touched.message && errors.message ? "message-error" : "message-count"}
                                className="resize-none rounded-xl px-4 py-3"
                            />
                            <p id="message-count" className="text-right text-xs text-muted-foreground">
                                {values.message.length}/{MESSAGE_MAX}
                            </p>
                            <FieldError name="message" message={touched.message ? errors.message : undefined} />
                        </div>

                        {/* Honeypot: invisible to people and assistive tech; bots fill it in. */}
                        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                            <label htmlFor="website">Website</label>
                            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={handleChange} />
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Booking…" : "Book My Demo"}
                        </Button>
                    </Form>
                );
            }}
        </Formik>
    );
}
