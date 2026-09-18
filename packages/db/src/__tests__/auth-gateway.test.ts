import {
  AuthApiError,
  AuthRetryableFetchError,
} from "@supabase/supabase-js";
import type { PxSupabaseClient } from "../client";
import { SupabaseAuthGateway, toAuthFailure } from "../auth-gateway";

function apiError(code: string | undefined, status = 400) {
  const error = new AuthApiError("recusado", status, code);
  return error;
}

describe("toAuthFailure", () => {
  it("falha de rede (DNS, projeto pausado, modo avião) vira network", () => {
    expect(
      toAuthFailure(new AuthRetryableFetchError("fetch failed", 0)),
    ).toBe("network");
  });

  it.each([
    ["invalid_credentials", "invalid-credentials"],
    ["email_not_confirmed", "email-not-confirmed"],
    ["user_already_exists", "email-taken"],
    ["email_exists", "email-taken"],
    ["weak_password", "weak-password"],
    ["over_email_send_rate_limit", "rate-limited"],
    ["over_request_rate_limit", "rate-limited"],
  ])("code %s → %s", (code, expected) => {
    expect(toAuthFailure(apiError(code))).toBe(expected);
  });

  it("servidor antigo: 400 sem code é credencial inválida", () => {
    expect(toAuthFailure(apiError(undefined, 400))).toBe("invalid-credentials");
  });

  it("qualquer outra coisa é unknown", () => {
    expect(toAuthFailure(apiError(undefined, 500))).toBe("unknown");
    expect(toAuthFailure(new Error("boom"))).toBe("unknown");
  });
});

function fakeAuthClient(auth: Record<string, unknown>) {
  return { auth } as unknown as PxSupabaseClient;
}

describe("SupabaseAuthGateway", () => {
  it("signIn ok", async () => {
    const client = fakeAuthClient({
      signInWithPassword: async () => ({ data: {}, error: null }),
    });
    expect(await new SupabaseAuthGateway(client).signIn("a@b.co", "x")).toEqual(
      { ok: true },
    );
  });

  it("signIn sem rede não diz que a senha está errada", async () => {
    const client = fakeAuthClient({
      signInWithPassword: async () => ({
        data: {},
        error: new AuthRetryableFetchError("fetch failed", 0),
      }),
    });
    expect(await new SupabaseAuthGateway(client).signIn("a@b.co", "x")).toEqual(
      { ok: false, reason: "network" },
    );
  });

  it("signUp sem sessão = confirmação de e-mail pendente", async () => {
    const client = fakeAuthClient({
      signUp: async () => ({ data: { session: null, user: {} }, error: null }),
    });
    expect(
      await new SupabaseAuthGateway(client).signUp("a@b.co", "segredo"),
    ).toEqual({ ok: true, needsConfirmation: true });
  });

  it("signUp com sessão = entra direto", async () => {
    const client = fakeAuthClient({
      signUp: async () => ({
        data: { session: { access_token: "t" }, user: {} },
        error: null,
      }),
    });
    expect(
      await new SupabaseAuthGateway(client).signUp("a@b.co", "segredo"),
    ).toEqual({ ok: true, needsConfirmation: false });
  });

  it("signOut não explode sem rede (a sessão local sai de qualquer jeito)", async () => {
    const signOut = jest.fn(async () => ({
      error: new AuthRetryableFetchError("fetch failed", 0),
    }));
    const client = fakeAuthClient({ signOut });

    await expect(new SupabaseAuthGateway(client).signOut()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
