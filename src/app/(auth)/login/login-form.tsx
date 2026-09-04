"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { loginAction, signupAction, type AuthFormState } from "./actions";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginFormAction] = useActionState(loginAction, initialState);
  const [signupState, signupFormAction] = useActionState(signupAction, initialState);

  const state = mode === "login" ? loginState : signupState;

  return (
    <Card>
      <div className="mb-6 text-center">
        <Image
          src="/brand/logo-kleur.png"
          alt="i_lab"
          width={140}
          height={55}
          priority
          className="mx-auto mb-3 h-11 w-auto"
        />
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "Log in om verder te gaan" : "Maak een account aan"}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-lg border border-border p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md py-2 transition-colors ${
            mode === "login" ? "bg-accent text-white" : "text-muted"
          }`}
        >
          Inloggen
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md py-2 transition-colors ${
            mode === "signup" ? "bg-accent text-white" : "text-muted"
          }`}
        >
          Account aanmaken
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginFormAction} className="space-y-4">
          <Field label="E-mailadres" htmlFor="email">
            <Input id="email" name="email" type="email" required autoFocus />
          </Field>
          <Field label="Wachtwoord" htmlFor="password">
            <Input id="password" name="password" type="password" required />
          </Field>
          <SubmitButton size="lg" className="w-full">
            Inloggen
          </SubmitButton>
          <p className="text-center text-sm">
            <Link href="/wachtwoord-vergeten" className="text-accent hover:underline">
              Wachtwoord vergeten?
            </Link>
          </p>
        </form>
      ) : (
        <form action={signupFormAction} className="space-y-4">
          <Field label="Naam" htmlFor="full_name">
            <Input id="full_name" name="full_name" type="text" required autoFocus />
          </Field>
          <Field label="E-mailadres" htmlFor="signup_email">
            <Input id="signup_email" name="email" type="email" required />
          </Field>
          <Field label="Wachtwoord" htmlFor="signup_password">
            <Input
              id="signup_password"
              name="password"
              type="password"
              minLength={6}
              required
            />
          </Field>
          <SubmitButton size="lg" className="w-full">
            Account aanmaken
          </SubmitButton>
        </form>
      )}

      {state.error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.info && (
        <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent-hover">
          {state.info}
        </p>
      )}
    </Card>
  );
}
