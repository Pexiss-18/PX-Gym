import { SignUpUseCase } from "../use-cases/auth";
import { AutenticarUsuarioUseCase } from "../use-cases/autenticar-usuario";
import { EncerrarSessaoUseCase, RestaurarSessaoUseCase } from "../use-cases/gerenciar-sessao";
import { SessionStorageFake } from "../../testing/fakes-ciclo";
import { FixedClock } from "../../testing/fakes";
import { Email } from "../../domain/value-objects/email";
import { InvalidValueError } from "../../domain/errors";
import { FakeAuthGateway } from "../../testing/fakes";

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

describe("AutenticarUsuarioUseCase", () => {
  const setup = () => {
    const auth = new FakeAuthGateway();
    const sessoes = new SessionStorageFake();
    return { auth, sessoes, useCase: new AutenticarUsuarioUseCase(auth, sessoes) };
  };

  it("entra, manda o e-mail normalizado e guarda a sessão no aparelho", async () => {
    const { auth, sessoes, useCase } = setup();
    const result = await useCase.execute({ email: " Paulo@Exemplo.com", senha: "segredo" });

    expect(result.status).toBe("autenticado");
    expect(auth.calls).toEqual([{ op: "signIn", email: "paulo@exemplo.com" }]);
    expect(sessoes.sessao?.usuario.papel).toBe("aluno");
  });

  it("e-mail malformado é recusado sem ir à rede", async () => {
    const { auth, sessoes, useCase } = setup();
    const result = await useCase.execute({ email: "paulo", senha: "segredo" });

    expect(result).toEqual({ status: "recusado", motivo: "invalid-email" });
    expect(auth.calls).toHaveLength(0);
    expect(sessoes.sessao).toBeNull();
  });

  it("senha vazia é recusada sem ir à rede", async () => {
    const { auth, useCase } = setup();
    const result = await useCase.execute({ email: "paulo@exemplo.com", senha: "" });

    expect(result).toEqual({ status: "recusado", motivo: "missing-password" });
    expect(auth.calls).toHaveLength(0);
  });

  it("repassa o motivo do provedor (ex.: sem rede) em vez de culpar a senha", async () => {
    const { auth, sessoes, useCase } = setup();
    auth.signInOutcome = { ok: false, reason: "network" };

    const result = await useCase.execute({ email: "paulo@exemplo.com", senha: "segredo" });

    expect(result).toEqual({ status: "recusado", motivo: "network" });
    expect(sessoes.sessao).toBeNull();
  });
});

describe("RestaurarSessaoUseCase / EncerrarSessaoUseCase", () => {
  const agora = new Date("2026-09-29T12:00:00Z");
  const usuario = { id: "u", nome: "U", email: "u@x.com", papel: "aluno" as const };

  it("sem nada guardado, não há sessão", async () => {
    expect(await new RestaurarSessaoUseCase(new SessionStorageFake(), new FixedClock(agora)).execute()).toBeNull();
  });

  it("devolve a sessão guardada que ainda vale", async () => {
    const sessao = { usuario, token: "t", expiraEm: new Date("2026-10-01T00:00:00Z") };
    const restaurada = await new RestaurarSessaoUseCase(new SessionStorageFake(sessao), new FixedClock(agora)).execute();
    expect(restaurada).toEqual(sessao);
  });

  it("sessão vencida é apagada do aparelho", async () => {
    const sessoes = new SessionStorageFake({ usuario, token: "t", expiraEm: new Date("2026-09-01T00:00:00Z") });
    expect(await new RestaurarSessaoUseCase(sessoes, new FixedClock(agora)).execute()).toBeNull();
    expect(sessoes.sessao).toBeNull();
  });

  it("sair apaga a sessão local mesmo se o provedor falhar", async () => {
    const auth = new FakeAuthGateway();
    auth.signOut = async () => {
      throw new Error("sem rede");
    };
    const sessoes = new SessionStorageFake({ usuario, token: "t", expiraEm: null });
    await expect(new EncerrarSessaoUseCase(auth, sessoes).execute()).rejects.toThrow("sem rede");
    expect(sessoes.sessao).toBeNull();
  });

  it("sair encerra no provedor", async () => {
    const auth = new FakeAuthGateway();
    await new EncerrarSessaoUseCase(auth, new SessionStorageFake()).execute();
    expect(auth.signedOut).toBe(true);
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
