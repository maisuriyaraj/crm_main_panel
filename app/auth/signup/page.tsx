"use client";

import { motion } from "framer-motion";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { reqToBookADemo } from "@/lib/store/slices/publicAPisSlice";
import { useAppDispatch } from "@/lib/store/hooks";
import { notify } from "@/lib/commonFunctions";

const teamSizeOptions = [
    { value: "", label: "Select team size" },
    { value: "1-10", label: "1 - 10" },
    { value: "11-50", label: "11 - 50" },
    { value: "51-200", label: "51 - 200" },
    { value: "200+", label: "200+" },
];

interface BookDemoValues {
    fullName: string;
    businessEmail: string;
    businessName: string;
    teamSize: string;
    phoneNumber: string;
    preferredDate: string;
    message: string;
}

const initialValues: BookDemoValues = {
    fullName: "",
    businessEmail: "",
    businessName: "",
    teamSize: "",
    phoneNumber: "",
    preferredDate: "",
    message: "",
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const BookDemoSchema = Yup.object().shape({
    fullName: Yup.string()
        .trim()
        .min(2, "Full name must be at least 2 characters")
        .max(60, "Full name must be under 60 characters")
        .required("Full name is required"),
    businessEmail: Yup.string()
        .trim()
        .email("Enter a valid business email")
        .required("Business email is required"),
    businessName: Yup.string()
        .trim()
        .min(2, "Business name must be at least 2 characters")
        .max(80, "Business name must be under 80 characters")
        .required("Business name is required"),
    teamSize: Yup.string().required("Please select your team size"),
    phoneNumber: Yup.string()
        .matches(/^[+]?[\d\s-]{7,15}$/, "Enter a valid phone number")
        .notRequired(),
    preferredDate: Yup.date()
        .typeError("Select a preferred date")
        .min(today, "Preferred date can't be in the past")
        .required("Preferred date is required"),
    message: Yup.string().max(500, "Message must be under 500 characters"),
});

export default function BookDemo() {
    const dispatch = useAppDispatch();
    const handleSubmit = async (
        values: BookDemoValues,
        { setSubmitting, resetForm }: { setSubmitting: (v: boolean) => void; resetForm: () => void }
    ) => {
        try {
            console.log(values)
            const reqObj = {
                "full_name": values.fullName,
                "email": values.businessEmail,
                "mobile": values.phoneNumber,
                "organization_name": values.businessName,
                "organization_type": "asdasdsd",
                "team_members_count": values.teamSize,
                "scheduled_at":  values.preferredDate,
                "meeting_type": "virtual",
                "invite_emails": [],
                "business_requirements": values.message
            }

            console.log("reqObj =>> ",reqObj)
            dispatch(reqToBookADemo({ data: reqObj, onSuccess: () => { 
                notify("Demo booked successfully! We'll reach out to you soon.", { type: "success" });
             }, onFailure: () => { 
                notify("Failed to book demo. Please try again later.", { type: "error" });
              } }));
            resetForm();
        } catch (error) {
            console.error("Failed to book demo:", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute top-20 left-20 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[140px]"
                />

                <motion.div
                    animate={{ x: [0, -120, 0], y: [0, 80, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-20 right-20 h-[450px] w-[450px] rounded-full bg-cyan-500/20 blur-[140px]"
                />
            </div>

            <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
                {/* Left */}
                <div className="hidden lg:flex flex-col justify-between p-16">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow"
                    >
                        <div>
                            <h1 className="text-5xl font-bold leading-tight">
                                See OrbitOps
                                <br />
                                In Action
                            </h1>

                            <p className="mt-6 text-lg text-muted-foreground">
                                Book a personalized walkthrough of CRM, Billing, Automation,
                                Marketing and Ads Management.
                            </p>

                            <div className="mt-8 space-y-4">
                                <div>✓ 30 Minute Live Walkthrough</div>
                                <div>✓ Tailored To Your Team&apos;s Workflow</div>
                                <div>✓ No Commitment Required</div>
                                <div>✓ Get Your Questions Answered Live</div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="text-sm text-muted-foreground">
                        Powered by RJ Industries
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center justify-center px-6 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow"
                    >
                        <h1 className="text-3xl font-bold">Book a Demo</h1>

                        <p className="mt-2 text-muted-foreground">
                            Fill in your details and we&apos;ll set up a time that works for you.
                        </p>

                        <Formik
                            initialValues={initialValues}
                            validationSchema={BookDemoSchema}
                            onSubmit={handleSubmit}
                        >
                            {({ isSubmitting }) => (
                                <Form className="mt-8 space-y-4" noValidate>
                                    <div>
                                        <Field
                                            name="fullName"
                                            type="text"
                                            placeholder="Full Name"
                                            className="w-full rounded-xl border border-border px-4 py-3"
                                        />
                                        <ErrorMessage
                                            name="fullName"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <div>
                                        <Field
                                            name="businessEmail"
                                            type="email"
                                            placeholder="Business Email"
                                            className="w-full rounded-xl border border-border px-4 py-3"
                                        />
                                        <ErrorMessage
                                            name="businessEmail"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <div>
                                        <Field
                                            name="businessName"
                                            type="text"
                                            placeholder="Business Name"
                                            className="w-full rounded-xl border border-border px-4 py-3"
                                        />
                                        <ErrorMessage
                                            name="businessName"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <div>
                                        <Field
                                            as="select"
                                            name="teamSize"
                                            className="w-full rounded-xl border border-border px-4 py-3 bg-background"
                                        >
                                            {teamSizeOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Field>
                                        <ErrorMessage
                                            name="teamSize"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <div>
                                        <Field
                                            name="phoneNumber"
                                            type="tel"
                                            placeholder="Phone Number (optional)"
                                            className="w-full rounded-xl border border-border px-4 py-3"
                                        />
                                        <ErrorMessage
                                            name="phoneNumber"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <div>
                                        <Field
                                            name="preferredDate"
                                            type="date"
                                            className="w-full rounded-xl border border-border px-4 py-3"
                                        />
                                        <ErrorMessage
                                            name="preferredDate"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <div>
                                        <Field
                                            as="textarea"
                                            name="message"
                                            rows={3}
                                            placeholder="Anything specific you'd like us to cover? (optional)"
                                            className="w-full rounded-xl border border-border px-4 py-3 resize-none"
                                        />
                                        <ErrorMessage
                                            name="message"
                                            component="p"
                                            className="mt-1 text-sm text-red-500"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                                    >
                                        {isSubmitting ? "Booking..." : "Book My Demo"}
                                    </button>
                                </Form>
                            )}
                        </Formik>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}