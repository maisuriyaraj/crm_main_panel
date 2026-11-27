"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";

import type {
  Lead,
  LeadCustomFieldDefinition,
  LeadOwner,
  LeadPicklistEntry,
  LeadPriority,
  LeadStage,
  LeadTemperature,
} from "@/lib/leads/types";
import { CALL_STATUS_LABEL, LIFECYCLE_LABEL, stageOutcome } from "@/lib/leads/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/leads/tag-input";
import { FieldHelp } from "@/components/shared/field-help";
import { useFieldHelp } from "@/hooks/useFieldHelp";

// "Nothing chosen" for a Select. Radix treats "" as no value at all, so a
// clearable dropdown needs a real value standing for empty.
const NONE = "__none__";

const leadFormSchema = z
  .object({
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
    mobile: z.string().optional(),
    alternateMobile: z.string().optional(),
    designation: z.string().optional(),
    website: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    temperature: z.enum(["cold", "warm", "hot"]),
    statusId: z.string().min(1, "Stage is required"),
    assignedTo: z.string().optional(),
    sourceId: z.string().optional(),
    channelId: z.string().optional(),
    value: z.string().optional(),
    probability: z.string().optional(),
    leadScore: z.string().optional(),
    expectedCloseDate: z.string().optional(),
    nextFollowupAt: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    // Keyed by the organization's own field keys. Their types and whether they
    // are required are checked against the definitions on submit, because only
    // then is it known what fields this organization has.
    customFields: z.record(z.string(), z.union([z.string(), z.boolean()])),
  })
  // A lead needs any one of a name, an email or a mobile — not a name on its
  // own. Someone taking a call may only have the number.
  .superRefine((values, ctx) => {
    const filled = [values.fullName, values.firstName, values.lastName, values.email, values.mobile]
      .some((field) => (field ?? "").trim() !== "");
    if (!filled) {
      ctx.addIssue({
        code: "custom",
        path: ["fullName"],
        message: "Give at least a name, an email address or a mobile number",
      });
    }
  });

export type LeadFormValues = z.infer<typeof leadFormSchema>;

const buildEmptyValues = (statuses: LeadStage[]): LeadFormValues => ({
  fullName: "",
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  mobile: "",
  alternateMobile: "",
  designation: "",
  website: "",
  priority: "medium",
  temperature: "warm",
  statusId: statuses[0]?.id ?? "",
  assignedTo: "",
  sourceId: "",
  channelId: "",
  value: "",
  probability: "",
  leadScore: "0",
  expectedCloseDate: "",
  nextFollowupAt: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  description: "",
  tags: [],
  customFields: {},
});

// A stored moment shown in a `datetime-local` input, which has no time zone of
// its own: the browser's own zone is what the person set it in.
const toLocalInput = (iso?: string): string => {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

// Every custom value reaches the form as a string, except a yes/no which stays
// a boolean, because that is what each input gives back.
const toFormCustomFields = (
  definitions: LeadCustomFieldDefinition[],
  stored?: Record<string, string | number | boolean | null>,
): Record<string, string | boolean> => {
  const values: Record<string, string | boolean> = {};
  definitions.forEach((definition) => {
    const held = stored?.[definition.key];
    if (definition.fieldType === "checkbox") {
      values[definition.key] = held === true;
      return;
    }
    values[definition.key] = held === null || held === undefined ? "" : String(held);
  });
  return values;
};

const toFormValues = (
  lead: Lead,
  definitions: LeadCustomFieldDefinition[],
): LeadFormValues => ({
  fullName: lead.fullName ?? "",
  firstName: lead.firstName ?? "",
  lastName: lead.lastName ?? "",
  companyName: lead.companyName ?? "",
  email: lead.email ?? "",
  mobile: lead.mobile ?? "",
  alternateMobile: lead.alternateMobile ?? "",
  designation: lead.designation ?? "",
  website: lead.website ?? "",
  priority: lead.priority,
  temperature: lead.temperature,
  statusId: lead.statusId,
  assignedTo: lead.assignedTo ?? "",
  sourceId: lead.sourceId ?? "",
  channelId: lead.channelId ?? "",
  value: typeof lead.value === "number" ? String(lead.value) : "",
  probability: typeof lead.probability === "number" ? String(lead.probability) : "",
  leadScore: String(lead.leadScore),
  expectedCloseDate: lead.expectedCloseDate ?? "",
  nextFollowupAt: toLocalInput(lead.nextFollowupAt),
  address: lead.address ?? "",
  city: lead.city ?? "",
  state: lead.state ?? "",
  country: lead.country ?? "",
  pincode: lead.pincode ?? "",
  description: lead.description ?? "",
  tags: lead.tags,
  customFields: toFormCustomFields(definitions, lead.customFields),
});

// What the API is sent for the organization's own fields: the typed value for
// each, or null to clear it. A field switched off since the lead was saved is
// left out — the API would refuse a key it no longer has.
export const customFieldsForApi = (
  definitions: LeadCustomFieldDefinition[],
  values: Record<string, string | boolean>,
): Record<string, string | number | boolean | null> => {
  const payload: Record<string, string | number | boolean | null> = {};
  definitions.forEach((definition) => {
    const held = values[definition.key];
    if (definition.fieldType === "checkbox") {
      payload[definition.key] = held === true;
      return;
    }
    const text = typeof held === "string" ? held.trim() : "";
    if (text === "") {
      payload[definition.key] = null;
      return;
    }
    payload[definition.key] = definition.fieldType === "number" ? Number(text) : text;
  });
  return payload;
};

interface LeadFormDialogProps {
  trigger?: React.ReactNode;
  mode: "create" | "edit";
  initialLead?: Lead;
  statuses: LeadStage[];
  owners: LeadOwner[];
  // The organization's own lists. Only the switched-on entries are offered,
  // except the one a lead already carries, which stays so editing it does not
  // force a change.
  sources: LeadPicklistEntry[];
  channels: LeadPicklistEntry[];
  customFields: LeadCustomFieldDefinition[];
  // The board the new lead joins, shown so nobody has to guess. Moving a lead
  // to another board is a separate step, because its stage has to move with it.
  pipelineName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (values: LeadFormValues) => void;
}

export function LeadFormDialog({
  trigger,
  mode,
  initialLead,
  statuses,
  owners,
  sources,
  channels,
  customFields,
  pipelineName,
  open: controlledOpen,
  onOpenChange,
  onSubmit,
}: LeadFormDialogProps) {
  // The same ⓘ copy the Leads table shows, served by the API.
  const fieldHelp = useFieldHelp("leads");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [moreOpen, setMoreOpen] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: buildEmptyValues(statuses),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      mode === "edit" && initialLead
        ? toFormValues(initialLead, customFields)
        : { ...buildEmptyValues(statuses), customFields: toFormCustomFields(customFields) },
    );
    setMoreOpen(false);
  }, [open, mode, initialLead, statuses, customFields, form]);

  // A retired entry stays listed while a lead still carries it, so editing that
  // lead's other fields does not quietly change where it came from.
  const offer = (entries: LeadPicklistEntry[], currentId?: string) =>
    entries.filter((entry) => entry.isActive || entry.id === currentId);

  const sourceChoices = offer(sources, initialLead?.sourceId);
  const channelChoices = offer(channels, initialLead?.channelId);

  const chosenStageId = form.watch("statusId");
  const chosenStage = statuses.find((stage) => stage.id === chosenStageId);
  // Lifecycle follows the stage, so the form can say what choosing this stage
  // will mean without the API being asked.
  const lifecycle = chosenStage
    ? stageOutcome(chosenStage) === "won"
      ? "closed"
      : stageOutcome(chosenStage) === "lost"
        ? "dead"
        : "active"
    : null;

  const activeCustomFields = useMemo(
    () => customFields.filter((definition) => definition.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [customFields],
  );

  const handleSubmit = (values: LeadFormValues) => {
    // The organization's own fields are checked here rather than in the schema:
    // what they are, and which are required, is only known once the definitions
    // have loaded.
    let firstBadKey: string | null = null;
    for (const definition of activeCustomFields) {
      const held = values.customFields[definition.key];
      if (definition.fieldType === "checkbox") continue;
      const text = typeof held === "string" ? held.trim() : "";

      if (definition.isRequired && text === "") {
        form.setError(`customFields.${definition.key}` as never, {
          type: "required",
          message: `${definition.label} is required`,
        });
        firstBadKey = firstBadKey ?? definition.key;
        continue;
      }
      if (text !== "" && definition.fieldType === "number" && !Number.isFinite(Number(text))) {
        form.setError(`customFields.${definition.key}` as never, {
          type: "validate",
          message: `${definition.label} must be a number`,
        });
        firstBadKey = firstBadKey ?? definition.key;
      }
    }
    if (firstBadKey) {
      setMoreOpen(true);
      return;
    }

    // The dialog is deliberately left open: the caller closes it once the API
    // has accepted the lead, so a refusal — a duplicate, the plan's lead limit —
    // does not throw away everything that was typed.
    onSubmit(values);
  };

  const renderCustomField = (definition: LeadCustomFieldDefinition) => (
    <FormField
      key={definition.id}
      control={form.control}
      name={`customFields.${definition.key}` as never}
      render={({ field }) => (
        <FormItem className={definition.fieldType === "checkbox" ? "col-span-2" : undefined}>
          <FormLabel>
            {definition.label}
            {definition.isRequired && <span className="text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            {definition.fieldType === "checkbox" ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  id={`custom-${definition.key}`}
                />
                <Label htmlFor={`custom-${definition.key}`} className="text-sm font-normal text-muted-foreground">
                  Yes
                </Label>
              </div>
            ) : definition.fieldType === "picklist" ? (
              <Select
                value={(field.value as string) || NONE}
                onValueChange={(next) => field.onChange(next === NONE ? "" : next)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {definition.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={definition.fieldType === "number" ? "number" : definition.fieldType === "date" ? "date" : "text"}
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Lead" : "Edit Lead"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              A lead needs at least one of a name, an email address or a mobile number.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input placeholder="VP Sales" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 90000 00000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Stage
                      <FieldHelp text={fieldHelp("stage")} />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Both read the stage, so they sit beside it: the board the lead
                  goes on, and what the chosen stage means for the lead. */}
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Pipeline
                  <FieldHelp text="The board this lead sits on. To move a lead to another board, edit it and pick a stage from that board." />
                </FormLabel>
                <div className="flex h-9 items-center gap-2 text-sm">
                  <Badge variant="secondary">{pipelineName ?? "Default pipeline"}</Badge>
                  {lifecycle && (
                    <Badge variant={lifecycle === "active" ? "outline" : lifecycle === "closed" ? "default" : "destructive"}>
                      {LIFECYCLE_LABEL[lifecycle]}
                    </Badge>
                  )}
                </div>
              </FormItem>

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Owner
                      <FieldHelp text={fieldHelp("assignee")} />
                    </FormLabel>
                    <Select
                      onValueChange={(next) => field.onChange(next === NONE ? "" : next)}
                      value={field.value || NONE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Source
                      <FieldHelp text="Where this lead came from — an event, a campaign, a form, or typed in by hand." />
                    </FormLabel>
                    <Select
                      onValueChange={(next) => field.onChange(next === NONE ? "" : next)}
                      value={field.value || NONE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Not set</SelectItem>
                        {sourceChoices.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.name}
                            {!entry.isActive && " (switched off)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Channel
                      <FieldHelp text="How contact with this lead happens — phone, WhatsApp, walk-in. Different from the source, which is where it came from." />
                    </FormLabel>
                    <Select
                      onValueChange={(next) => field.onChange(next === NONE ? "" : next)}
                      value={field.value || NONE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Not set</SelectItem>
                        {channelChoices.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.name}
                            {!entry.isActive && " (switched off)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Priority
                      <FieldHelp text={fieldHelp("priority")} />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["low", "medium", "high", "urgent"] as LeadPriority[]).map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Temperature
                      <FieldHelp text={fieldHelp("temperature")} />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["cold", "warm", "hot"] as LeadTemperature[]).map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Deal Value
                      <FieldHelp text={fieldHelp("value")} />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedCloseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Expected close date
                      <FieldHelp text="When you expect this lead to close. Used for forecasting, not a deadline." />
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Probability (%)
                      <FieldHelp text={fieldHelp("probability")} />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} placeholder="0" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Lead Score
                      <FieldHelp text={fieldHelp("lead_score")} />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} placeholder="0" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextFollowupAt"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="flex items-center gap-1">
                      Next follow-up
                      <FieldHelp text="When this lead is next due a call or a message. Nothing reminds you yet — the Calendar and reminders are still to come." />
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {activeCustomFields.length > 0 && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <p className="text-sm font-medium">Your organization&apos;s fields</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {activeCustomFields.map(renderCustomField)}
                </div>
              </div>
            )}

            {/* The fields most leads do not need, folded away so the form opens
                short. A validation failure inside opens it again. */}
            <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="gap-1 px-0">
                  <ChevronDown className="h-4 w-4" /> More details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="alternateMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Alternate mobile
                          <FieldHelp text="A second number to try when the main one does not answer. Also where a WhatsApp-only number goes." />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="+91 90000 00000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Read-only, both of them. The campaign is filled in by the
                      ad lead forms, which do not exist yet, and the call
                      outcome is set by logging a call on the lead. */}
                  {mode === "edit" && initialLead && (
                    <>
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Campaign
                          <FieldHelp text="The ad campaign this lead came from. Filled in automatically once ad lead forms are connected." />
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {initialLead.adCampaign?.name ?? "Not linked to a campaign"}
                        </p>
                      </FormItem>

                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Last call
                          <FieldHelp text="Set by logging a call on this lead, from the lead's own panel." />
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {CALL_STATUS_LABEL[initialLead.lastCallStatus ?? "none"]}
                        </p>
                      </FormItem>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Tags
                    <FieldHelp text={fieldHelp("tags")} />
                  </FormLabel>
                  <FormControl>
                    <TagInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What does this opportunity look like?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{mode === "create" ? "Create Lead" : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
