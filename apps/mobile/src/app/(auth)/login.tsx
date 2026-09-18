import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Field } from "@/components/field";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    }
    // sucesso: o Stack.Protected do root troca pra área logada sozinho
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
          <Text className="font-sans-semibold text-xl text-paper">Entrar</Text>
          <Text className="mt-1 font-sans text-sm text-fog">
            Acesse seu painel de treino e nutrição.
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
              autoComplete="current-password"
            />

            {error ? (
              <Text className="font-sans text-sm text-protein">{error}</Text>
            ) : null}

            <View className="mt-2">
              <PillButton onPress={handleSubmit} loading={loading}>
                Entrar
              </PillButton>
            </View>
          </View>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="font-sans text-sm text-fog">
              Ainda não tem conta?
            </Text>
            <Link href="/cadastro" className="font-sans-medium text-sm text-volt">
              Criar conta
            </Link>
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
