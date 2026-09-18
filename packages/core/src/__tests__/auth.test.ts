import { SignInUseCase, SignUpUseCase } from "../use-cases/auth";
import { Email } from "../value-objects/email";
import { InvalidValueError } from "../errors";
import { FakeAuthGateway } from "../testing/fakes";

describe("Email", () => {
  it("normaliza espaços e maiúsculas", () => {
    expect(Email.parse("  Paulo@Exemplo.COM ").value).toBe("paulo@exemplo.com");
  });

  it.each(["", "paulo", "paulo@", "@exemplo.com", "paulo@exemplo", "a b@c.com"])(
    "rejeita %p",
    (raw) => {
      expect(Email.isValid(raw)).toBe(false);
      expect(() => Email.parse(raw)).toThrow(InvalidValueError);
    },
  );
});

describe("SignInUseCase", () => {
  it("entra com credenciais aceitas, mandando o e-mail normalizado", async () => {
    const auth = new FakeAuthGateway();
    const result = await new SignInUseCase(auth).execute({
      email: " Paulo@Exemplo.com",
      password: "segredo",
    });

    expect(result).toEqual({ status: "signed-in" });
    expect(auth.calls).toEqual([{ op: "signIn", email: "paulo@exemplo.com" }]);
  });

  it("e-mail malformado é recusado sem ir à rede", async () => {
    const auth = new FakeAuthGateway();
    const result = await new SignInUseCase(auth).execute({
      email: "paulo",
      password: "segredo",
    });

    expect(result).toEqual({ status: "rejected", reason: "invalid-email" });
    expect(auth.calls).toHaveLength(0);
  });

  it("senha vazia é recusada sem ir à rede", async () => {
    const auth = new FakeAuthGateway();
    const result = await new SignInUseCase(auth).execute({
      email: "paulo@exemplo.com",
      password: "",
    });

    expect(result).toEqual({ status: "rejected", reason: "missing-password" });
    expect(auth.calls).toHaveLength(0);
  });

  it("repassa o motivo do provedor (ex.: sem rede) em vez de culpar a senha", async () => {
    const auth = new FakeAuthGateway();
    auth.signInOutcome = { ok: false, reason: "network" };

    const result = await new SignInUseCase(auth).execute({
      email: "paulo@exemplo.com",
      password: "segredo",
    });

    expect(result).toEqual({ status: "rejected", reason: "network" });
  });
});

describe("SignUpUseCase", () => {
  const valid = {
    email: "paulo@exemplo.com",
    password: "segredo1",
    passwordConfirmation: "segredo1",
  };

  it("cria conta com sessão imediata", async () => {
    const auth = new FakeAuthGateway();
    expect(await new SignUpUseCase(auth).execute(valid)).toEqual({
      status: "signed-up",
    });
  });

  it("projeto com confirmação de e-mail: avisa que o link foi enviado", async () => {
    const auth = new FakeAuthGateway();
    auth.signUpOutcome = { ok: true, needsConfirmation: true };

    expect(await new SignUpUseCase(auth).execute(valid)).toEqual({
      status: "confirmation-sent",
    });
  });

  it("senha curta é recusada antes da rede", async () => {
    const auth = new FakeAuthGateway();
    const result = await new SignUpUseCase(auth).execute({
      ...valid,
      password: "12345",
      passwordConfirmation: "12345",
    });

    expect(result).toEqual({ status: "rejected", reason: "password-too-short" });
    expect(auth.calls).toHaveLength(0);
  });

  it("confirmação diferente é recusada antes da rede", async () => {
    const auth = new FakeAuthGateway();
    const result = await new SignUpUseCase(auth).execute({
      ...valid,
      passwordConfirmation: "outra-senha",
    });

    expect(result).toEqual({ status: "rejected", reason: "password-mismatch" });
    expect(auth.calls).toHaveLength(0);
  });

  it("e-mail já cadastrado vem do provedor", async () => {
    const auth = new FakeAuthGateway();
    auth.signUpOutcome = { ok: false, reason: "email-taken" };

    expect(await new SignUpUseCase(auth).execute(valid)).toEqual({
      status: "rejected",
      reason: "email-taken",
    });
  });
});
