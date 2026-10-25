"use client";

import BookDemoForm from "@/components/booking/BookDemoForm";

export default function BookDemo() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[140px]" />

                <div className="absolute bottom-20 right-20 h-[450px] w-[450px] rounded-full bg-cyan-500/20 blur-[140px]" />
            </div>

            <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
                {/* Left */}
                <div className="hidden lg:flex flex-col justify-between p-16">
                    <div className="rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
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
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Powered by RJ Industries
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
                        <h1 className="text-3xl font-bold">Book a Demo</h1>

                        <p className="mt-2 text-muted-foreground">
                            Pick a time that suits you and tell us a little about your business.
                        </p>

                        <BookDemoForm />
                    </div>
                </div>
            </div>
        </div>
    );
}