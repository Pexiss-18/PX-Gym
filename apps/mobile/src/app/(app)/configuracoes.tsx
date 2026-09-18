import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import Constants from "expo-constants";
import { LogOut, Menu, RefreshCw } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/lib/auth-context";
import { trySyncPhotos } from "@/lib/photos";
import { usePendingSync } from "@/lib/use-local-data";
import { trySyncSetLogs } from "@/lib/workout";

/**
 * Configurações: conta (e-mail + sair), estado da sincronização offline-first
 * (pendências ao vivo do SQLite + sync manual) e versão do app.
 */
export default function ConfiguracoesScreen() {
  const navigation = useNavigation();
  const { session, signOut } = useAuth();

  const pending = usePendingSync();

  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function syncNow() {
    if (!session || syncing) return;
    setSyncing(true);
    setFeedback(null);
    try {
      const result = await trySyncSetLogs(session.user.id);
      const photos = await trySyncPhotos();

      if (result.status === "offline" && photos?.status === "offline") {
        setFeedback(
          "Sem conexão agora — tudo fica guardado no aparelho e sobe sozinho quando a rede voltar.",
        );
        return;
      }
      const parts: string[] = [];
      if (result.synced > 0) parts.push(`${result.synced} série(s) enviada(s)`);
      if (result.removed > 0)
        parts.push(`${result.removed} remoção(ões) aplicada(s)`);
      if (photos && photos.uploaded > 0)
        parts.push(`${photos.uploaded} foto(s) enviada(s)`);

      // Havia rede, mas o servidor recusou ou não respondeu: não é "sem conexão".
      const failed =
        result.status === "error" || photos === null || photos.failed > 0;
      if (failed) {
        parts.push(
          parts.length === 0
            ? "O servidor não respondeu agora — o que falta continua guardado no aparelho e tenta de novo sozinho"
            : "o resto fica pra próxima tentativa",
        );
      }
      setFeedback(parts.length > 0 ? parts.join(" · ") : "Tudo em dia.");
    } finally {
      setSyncing(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(
      "Sair da conta?",
      "Seus registros locais continuam salvos no aparelho.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: () => void signOut() },
      ],
    );
  }

  return (
    <Screen bottomInset={24}>
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="font-sans-semibold text-3xl text-paper">
          Configurações
        </Text>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <Menu size={18} color={colors.paperForeground} />
        </Pressable>
      </View>

      <View className="gap-5">
        <View>
          <Text className="mb-2 font-sans-medium text-xs text-fog">Conta</Text>
          <GlassCard className="p-2">
            <View className="p-3.5">
              <Text className="font-sans text-[11px] text-fog">E-mail</Text>
              <Text className="font-sans-medium text-sm text-paper">
                {session?.user.email}
              </Text>
            </View>
            <Pressable
              onPress={confirmSignOut}
              className="mt-1 flex-row items-center gap-3 rounded-px-md p-3.5 active:bg-glass-fill"
            >
              <LogOut size={18} color={colors.alertRed} />
              <Text className="font-sans-medium text-sm text-alert">
                Sair da conta
              </Text>
            </Pressable>
          </GlassCard>
        </View>

        <View>
          <Text className="mb-2 font-sans-medium text-xs text-fog">
            Sincronização
          </Text>
          <GlassCard>
            {pending.allSynced ? (
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-volt" />
                <Text className="font-sans text-sm text-paper">
                  Tudo sincronizado com a nuvem.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                <SyncRow label="Séries aguardando envio" count={pending.sets} />
                <SyncRow
                  label="Remoções aguardando envio"
                  count={pending.removals}
                />
                <SyncRow
                  label="Fotos aguardando upload"
                  count={pending.photos}
                />
              </View>
            )}

            <View className="mt-4">
              <PillButton
                variant="ghost"
                loading={syncing}
                onPress={() => void syncNow()}
              >
                Sincronizar agora
              </PillButton>
            </View>

            {feedback ? (
              <View className="mt-3 flex-row items-start gap-2">
                <RefreshCw size={13} color={colors.fogMuted} />
                <Text className="flex-1 font-sans text-xs text-fog">
                  {feedback}
                </Text>
              </View>
            ) : null}
          </GlassCard>
        </View>

        <View>
          <Text className="mb-2 font-sans-medium text-xs text-fog">Sobre</Text>
          <GlassCard>
            <View className="flex-row items-baseline justify-between">
              <Text className="font-sans text-sm text-fog">Versão</Text>
              <Text className="font-mono text-sm text-paper">
                {Constants.expoConfig?.version ?? "0.1.0"}
              </Text>
            </View>
            <Text className="mt-3 font-sans text-xs text-fog">
              Px GYM — treino e nutrição offline-first. Seus registros ficam no
              aparelho e sincronizam com a nuvem quando há conexão.
            </Text>
          </GlassCard>
        </View>
      </View>
    </Screen>
  );
}

function SyncRow({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full bg-carbs" />
        <Text className="font-sans text-sm text-paper">{label}</Text>
      </View>
      <Text className="font-mono text-sm text-paper">{count}</Text>
    </View>
  );
}
