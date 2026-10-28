"use client";

import { CalendarCheck, Clock, MessagesSquare, ShieldCheck, Workflow } from "lucide-react";
import BookDemoForm from "@/components/booking/BookDemoForm";
import { AuthSplit } from "@/components/layout/public/AuthSplit";
import { AuthLayout } from "@/components/layout/public/AuthLayout";

const HIGHLIGHTS = [
    { icon: Clock, title: "30 minute live walkthrough", text: "A focused tour of the parts that matter to you." },
    { icon: Workflow, title: "Tailored to your workflow", text: "We shape the demo around how your team works today." },
    { icon: MessagesSquare, title: "Your questions answered live", text: "Bring your edge cases, we'll walk through them." },
    { icon: ShieldCheck, title: "No commitment required", text: "No card, no contract, just a conversation." },
];

const STEPS = ["Pick a time that suits you", "We confirm and send the meeting link", "Meet the team and see OrbitOps live"];

export default function BookDemo() {
    return (
        <AuthLayout>
            <AuthSplit
                eyebrow="Free personalized demo"
                title={<>See OrbitOps <span className="text-gradient">in action</span></>}
                description="Book a personalized walkthrough of CRM, Billing, Automation, Marketing and Ads Management, all in one place."
                cardTitle="Book a demo"
                cardDescription="Pick a time that suits you and tell us a little about your business."
                aside={
                    <>
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                                <li key={title} className="flex gap-3 rounded-2xl border border-border bg-glass p-4 backdrop-blur">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="size-5" aria-hidden />
                                    </span>
                                    <div>
                                        <p className="font-semibold">{title}</p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 hidden rounded-2xl border border-border bg-glass p-5 backdrop-blur lg:block">
                            <p className="flex items-center gap-2 text-sm font-semibold">
                                <CalendarCheck className="size-4 text-primary" aria-hidden /> What happens next
                            </p>
                            <ol className="mt-4 space-y-3">
                                {STEPS.map((step, i) => (
                                    <li key={step} className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </>
                }
            >
                <BookDemoForm />
            </AuthSplit>
        </AuthLayout>
    );
}
