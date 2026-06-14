"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function SignupPage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">

            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div animate={{ x: [0, 120, 0], y: [0, -80, 0], }} transition={{
                    duration: 18, repeat: Infinity,
                    ease: "linear",
                }}
                    className="absolute top-20 left-20 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[140px]" />

                <motion.div animate={{ x: [0, -120, 0], y: [0, 80, 0], }} transition={{
                    duration: 22, repeat: Infinity,
                    ease: "linear",
                }}
                    className="absolute bottom-20 right-20 h-[450px] w-[450px] rounded-full bg-cyan-500/20 blur-[140px]" />
            </div>

            <div className="relative z-10 grid min-h-screen lg:grid-cols-2">

                {/* Left */}
                <div className="hidden lg:flex flex-col justify-between p-16">
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                        className="rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
                        <div>
                            <h1 className="text-5xl font-bold leading-tight">
                                Start Your
                                <br />
                                Free Trial
                            </h1>

                            <p className="mt-6 text-lg text-muted-foreground">
                                Get access to CRM, Billing, Automation,
                                Marketing and Ads Management.
                            </p>

                            <div className="mt-8 space-y-4">
                                <div>✓ 14 Day Free Trial</div>
                                <div>✓ No Credit Card Required</div>
                                <div>✓ Unlimited Team Members</div>
                                <div>✓ Setup In Under 5 Minutes</div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="text-sm text-muted-foreground">
                        Powered by RJ Industries
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center justify-center px-6 py-12">

                    <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="w-full max-w-md rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
                        <h1 className="text-3xl font-bold">
                            Welcome Back
                        </h1>

                        <p className="mt-2 text-muted-foreground">
                            Sign in to access your OrbitOps workspace.
                        </p>

                        <form className="mt-8 space-y-4">
                            <input placeholder="Full Name" className="w-full rounded-xl border border-border px-4 py-3" />

                            <input placeholder="Business Email" className="w-full rounded-xl border border-border px-4 py-3" />

                            <input placeholder="Business Name" className="w-full rounded-xl border border-border px-4 py-3" />

                            <input placeholder="Team Size" className="w-full rounded-xl border border-border px-4 py-3" />

                            <input type="password" placeholder="Password"
                                className="w-full rounded-xl border border-border px-4 py-3" />

                            <button className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">
                                Start Free Trial
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm">
                            <Link href="/forgot-password" className="text-primary">
                                Forgot Password?
                            </Link>
                        </div>

                        <div className="mt-6 text-center text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="font-semibold text-primary">
                                Start Free Trial
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}