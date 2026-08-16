"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-parchment-50">
      {/* Left: the mark, quiet and confident — no stock imagery */}
      <div className="hidden lg:flex flex-col justify-between bg-ink text-parchment-50 p-12">
        <div className="font-display text-xl tracking-tight">LegalOS Nigeria</div>
        <div className="max-w-sm">
          <p className="font-display text-3xl leading-snug italic text-parchment-100">
            &ldquo;Every matter, every date, every naira — in one system of record.&rdquo;
          </p>
        </div>
        <p className="docket text-ink-100 border-brass/40">EST. 2026 · CHAMBERS EDITION</p>
      </div>

      {/* Right: the form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl text-ink-900 mb-1">Sign in</h1>
          <p className="text-sm text-ink-500 mb-8">Access your firm&apos;s workspace.</p>

          <form action={formAction} className="space-y-4">
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
                autoComplete="current-password"
                required
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-seal">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/reset-password" className="text-ink-500 hover:text-ink">
              Forgot password?
            </Link>
            <Link href="/signup" className="text-brass hover:text-brass-dark font-medium">
              Set up your firm →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
