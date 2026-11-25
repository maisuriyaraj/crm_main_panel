import { useCallback, useMemo } from "react";

import { useAppSelector } from "@/lib/store/hooks";
import { DEFAULT_DATE_FORMAT, formatDate, formatDateTime, type DateFormat } from "@/lib/dates";

/**
 * The organization's chosen date order, with the two formatters bound to it.
 *
 * The choice comes from the organization settings, which only members who may
 * manage settings can read, so anyone else falls back to the default order until
 * the API carries it on /auth/me for everyone.
 */
export function useDateFormat() {
    const settings = useAppSelector((state) => state.orgSettings.settings);
    const format: DateFormat = settings?.locale.date_format ?? DEFAULT_DATE_FORMAT;

    const date = useCallback((value: string | Date | null | undefined, fallback?: string) => formatDate(value, format, fallback), [format]);
    const dateTime = useCallback((value: string | Date | null | undefined, fallback?: string) => formatDateTime(value, format, fallback), [format]);

    return useMemo(() => ({ format, formatDate: date, formatDateTime: dateTime }), [format, date, dateTime]);
}
