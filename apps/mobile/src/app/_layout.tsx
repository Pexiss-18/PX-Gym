import "../global.css";

import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist";
import { GeistMono_600SemiBold } from "@expo-google-fonts/geist-mono";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { colors } from "@px/tokens";
import { AuthProvider } from "@/adapters/context/AuthContext";
import { CasosDeUsoProvider } from "@/adapters/context/CasosDeUsoContext";
import { useAuth } from "@/adapters/hooks/useAuth";
import { composicao } from "@/adapters/instancia";
import { db } from "@/db";
import migrations from "../../drizzle/migrations";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { sessao, carregando } = useAuth();

  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_600SemiBold,
  });

  // Aplica as migrations do SQLite antes de qualquer tela tocar no banco.
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);
  if (dbError) throw dbError;

  const ready = fontsLoaded && !carregando && dbReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    // Mantém a splash nativa visível; nada a renderizar ainda.
    return <View style={{ flex: 1, backgroundColor: colors.inkGround }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.inkGround },
      }}
    >
      <Stack.Protected guard={!!sessao}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!sessao}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Context API: a sessão e os use cases ficam disponíveis pra
          qualquer tela, sem prop drilling. */}
      <AuthProvider servicos={composicao.auth}>
        <CasosDeUsoProvider casos={composicao.casos}>
          <StatusBar style="light" />
          <RootNavigator />
        </CasosDeUsoProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
