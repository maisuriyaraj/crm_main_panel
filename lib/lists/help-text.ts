// The fallback copy for the ⓘ help on list columns and form fields (SRS SH-L8).
//
// The API is the source: it serves each column's help with the member's column
// choices (`field_help` on GET /app/list-preferences/:listKey), so a wording fix
// ships without a front-end release and the table, the chooser and the record
// form never explain a field three different ways. This map only covers the
// first render, before those preferences come back, and is read through
// hooks/useFieldHelp.ts — never directly by a component.
//
// Keyed by the API's own column key. Only genuinely unclear fields get an entry:
// a tooltip on "Name" or "Email" is noise, and noise is what makes people stop
// reading tooltips.

export const LEAD_FIELD_HELP: Record<string, string> = {
  stage: "Where this lead sits in the pipeline. Moving it to a won or lost stage closes the lead.",
  source: "Where the lead came from — a campaign, a form, an import or typed in by hand.",
  priority: "How urgently your team should work this lead. It does not affect scoring.",
  temperature: "How interested the lead is: hot, warm or cold. Set by whoever spoke to them last.",
  lead_score: "A 0–100 number your team sets to rank leads against each other.",
  value: "What the deal is expected to be worth if it closes.",
  expected_budget: "What the lead says they can spend. Often lower than the value you quote.",
  probability: "Your estimate of the chance this lead closes, as a percentage.",
  assignee: "The member who owns this lead. Only they, their team or an admin can see it, depending on roles.",
  tags: "Free labels for grouping leads — industry, event, campaign. Filter on them from the search bar.",
};

export const CONTACT_FIELD_HELP: Record<string, string> = {
  assignee: "The member who owns this contact. Record visibility follows the same Own / Team / All rule as leads.",
  source_lead_id: "The lead this contact was converted from, if it came out of the pipeline.",
  tags: "Free labels for grouping contacts. Filter on them from the search bar.",
  alternate_mobile: "A second number to try when the main one does not answer.",
  designation: "The contact's job title at their company.",
};

export const helpFor = (listKey: string, columnKey: string): string | undefined =>
  (listKey === "leads" ? LEAD_FIELD_HELP : CONTACT_FIELD_HELP)[columnKey];
