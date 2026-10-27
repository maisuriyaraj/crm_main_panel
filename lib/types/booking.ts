// Mirrors the backend's public Book a Demo contract (/api/public/bookings).
// If the API changes, change this file in the same PR.

export const TEAM_SIZES = ["1-10", "11-50", "51-200", "200+"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export interface BookingRequest {
    full_name: string;
    email: string;
    mobile?: string;
    organization_name: string;
    organization_type?: string;
    team_members_count: TeamSize;
    scheduled_at: string;
    timezone: string;
    meeting_type?: "virtual" | "onsite";
    business_requirements?: string;
    // Honeypot: always empty for real visitors.
    website?: string;
}

export interface BookingAck {
    reference: string;
    scheduled_at: string;
    timezone: string;
    duration_minutes: number;
    status: "pending";
}

export interface AvailabilityDay {
    date: string;
    slots: string[];
}

export interface Availability {
    business_timezone: string;
    duration_minutes: number;
    min_lead_minutes: number;
    max_horizon_days: number;
    // How many dates one availability request may cover.
    max_range_days: number;
    business_days: number[];
    open_time: string;
    close_time: string;
    days: AvailabilityDay[];
}

export interface ApiFieldError {
    field: string | null;
    message: string;
}

export interface BookingApiError {
    message: string;
    status?: number;
    code?: string;
    errors?: ApiFieldError[];
}
