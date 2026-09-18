import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Field } from "@/components/field";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/lib/auth-context";

export default function CadastroScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    // Regras de senha/e-mail moram no SignUpUseCase (@px/core).
    const result = await signUp(email, password, confirm);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.confirmationSent) {
      // Sem sessão ainda: o Supabase espera o clique no link do e-mail.
      setConfirmationSent(true);
      setLoading(false);
    }
    // conta já com sessão: o Stack.Protected do root troca de área sozinho
  }

  return (
    <Screen scroll={false} bottomInset={24}>
      <View className="flex-1 justify-center">
        <View className="mb-8 items-center">
          <Text className="font-sans-semibold text-3xl text-paper">
            Px <Text className="text-volt">GYM</Text>
          </Text>
        </View>

        <GlassCard className="p-7">
          <Text className="font-sans-semibold text-xl text-paper">
            Criar conta
          </Text>
          <Text className="mt-1 font-sans text-sm text-fog">
            Comece a acompanhar seu progresso hoje.
          </Text>

          <View className="mt-6 gap-4">
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <Field
              label="Confirmar senha"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
            />

            {error ? (
              <Text className="font-sans text-sm text-protein">{error}</Text>
            ) : null}

            {confirmationSent ? (
              <Text className="font-sans text-sm text-volt">
                Conta criada! Enviamos um link de confirmação pro seu e-mail —
                depois de confirmar, é só entrar com sua senha.
              </Text>
            ) : null}

            <View className="mt-2">
              <PillButton onPress={handleSubmit} loading={loading}>
                Criar conta
              </PillButton>
            </View>
          </View>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="font-sans text-sm text-fog">Já tem conta?</Text>
            <Link href="/login" className="font-sans-medium text-sm text-volt">
              Entrar
            </Link>
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
