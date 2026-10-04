"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { Contact, ContactOwner } from "@/lib/contacts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Length caps mirror the server's validators. The Leads form omits them and lets
// the server reject a too-long value, which surfaces as an unhelpful toast.
const contactFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(255, "Full name is too long"),
  firstName: z.string().max(100, "First name is too long").optional(),
  lastName: z.string().max(100, "Last name is too long").optional(),
  email: z.string().email("Enter a valid email").max(255).optional().or(z.literal("")),
  mobile: z.string().max(50, "Mobile is too long").optional(),
  alternateMobile: z.string().max(50, "Alternate mobile is too long").optional(),
  companyName: z.string().max(255, "Company is too long").optional(),
  designation: z.string().max(255, "Designation is too long").optional(),
  website: z.string().max(255, "Website is too long").optional(),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

const UNASSIGNED = "__unassigned__";

const buildEmptyValues = (): ContactFormValues => ({
  fullName: "",
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  alternateMobile: "",
  companyName: "",
  designation: "",
  website: "",
  description: "",
  assignedTo: "",
  tags: [],
});

const toFormValues = (contact: Contact): ContactFormValues => ({
  fullName: contact.fullName,
  firstName: contact.firstName ?? "",
  lastName: contact.lastName ?? "",
  email: contact.email ?? "",
  mobile: contact.mobile ?? "",
  alternateMobile: contact.alternateMobile ?? "",
  companyName: contact.companyName ?? "",
  designation: contact.designation ?? "",
  website: contact.website ?? "",
  description: contact.description ?? "",
  assignedTo: contact.assignedTo ?? "",
  tags: contact.tags,
});

export interface ContactFormServerError {
  field: string;
  message: string;
}

interface ContactFormDialogProps {
  trigger?: React.ReactNode;
  mode: "create" | "edit";
  initialContact?: Contact;
  owners: ContactOwner[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Resolves to true when the server accepted the write. The dialog stays open
  // on false so the user does not lose what they typed when a 400 or 409 comes
  // back and the errors are painted onto the fields.
  onSubmit: (values: ContactFormValues) => Promise<boolean>;
  serverErrors?: ContactFormServerError[];
}

export function ContactFormDialog({
  trigger,
  mode,
  initialContact,
  owners,
  open: controlledOpen,
  onOpenChange,
  onSubmit,
  serverErrors,
}: ContactFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: buildEmptyValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(mode === "edit" && initialContact ? toFormValues(initialContact) : buildEmptyValues());
  }, [open, mode, initialContact, form]);

  // Paint server-side field errors (the API's 400 `errors` array) onto the form.
  useEffect(() => {
    if (!serverErrors?.length) return;
    serverErrors.forEach(({ field, message }) => {
      form.setError(field as keyof ContactFormValues, { type: "server", message });
    });
  }, [serverErrors, form]);

  const handleSubmit = async (values: ContactFormValues) => {
    setSubmitting(true);
    try {
      const ok = await onSubmit(values);
      if (ok) setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Contact" : "Edit Contact"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
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
                      <Input placeholder="9876543210" {...field} />
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
                    <FormLabel>Alternate Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="acme.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      value={field.value ? field.value : UNASSIGNED}
                      onValueChange={(value) => field.onChange(value === UNASSIGNED ? "" : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
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
                name="tags"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tags</FormLabel>
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
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Anything worth remembering..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : mode === "create" ? "Create Contact" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
