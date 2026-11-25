// Indian GST identifiers, for the tax fields in company settings. The state code
// is the two-digit code GST uses, which is also the first two characters of every
// GSTIN registered in that state — so the form can tell straight away when the two
// don't belong together, before the API says so.
//
// The same list as the API's. 25 and 28 are absent on purpose: they were merged
// into 26 and replaced by 37.

export const GST_STATES: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
};

export const GST_STATE_CODES = Object.keys(GST_STATES).sort();

// Format only: two digits of state, the PAN, an entity number, Z and a check
// character. The check character itself is not verified here, nor by the API.
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const gstStateName = (code: string | null | undefined) => (code ? GST_STATES[code] ?? null : null);

export const gstinMatchesState = (gstin: string, stateCode: string) =>
    !gstin || !stateCode || gstin.slice(0, 2) === stateCode;

/** The country whose tax identity these fields are for. */
export const GST_COUNTRY = "IN";
