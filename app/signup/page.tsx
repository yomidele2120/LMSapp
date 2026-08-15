"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupNewFirm, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupNewFirm, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-50 p-8">
      <div className="w-full max-w-sm">
        <div className="font-display text-xl text-ink-900 mb-1">LegalOS Nigeria</div>
        <h1 className="font-display text-2xl text-ink-900 mb-1">Set up your firm</h1>
        <p className="text-sm text-ink-500 mb-8">
          You&apos;ll be the managing partner for this workspace and can invite the rest of your
          team afterward.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="firmName" className="block text-xs font-medium text-ink-500 mb-1.5">
              Firm name
            </label>
            <Input id="firmName" name="firmName" placeholder="e.g. Adeyemi &amp; Associates" required />
          </div>
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium text-ink-500 mb-1.5">
              Your full name
            </label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-ink-500 mb-1.5">
              Work email
            </label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-ink-500 mb-1.5">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-seal">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Setting up…" : "Create firm workspace"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brass hover:text-brass-dark font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
