import { Text, View } from "react-native";
import {
  Drawer,
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from "expo-router/drawer";
import {
  Camera,
  ClipboardList,
  FileSignature,
  MapPin,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "@px/tokens";
import { useAuth } from "@/adapters/hooks/useAuth";
import { displayName } from "@/lib/identity";
import { MODO_MOCK } from "@/lib/modo";
import { useWorkoutSync } from "@/lib/use-workout-sync";

type ItemMenu = { rota: string; rotulo: string; Icone: LucideIcon };

const RELATORIOS: ItemMenu = {
  rota: "relatorios",
  rotulo: "Relatórios do ciclo",
  Icone: FileSignature,
};

const FOTOS: ItemMenu = { rota: "fotos", rotulo: "Fotos de progresso", Icone: Camera };

/** Telas que leem do SQLite/Supabase — fora do ar no modo mock. */
const TELAS_COM_BANCO: ItemMenu[] = [
  { rota: "progresso", rotulo: "Progresso", Icone: TrendingUp },
  { rota: "avaliacoes", rotulo: "Avaliações", Icone: ClipboardList },
  FOTOS,
  { rota: "academias", rotulo: "Academias por perto", Icone: MapPin },
  { rota: "configuracoes", rotulo: "Configurações", Icone: Settings },
];

// No modo mock as fotos usam galeria em memória e câmera simulada.
const MENU = MODO_MOCK ? [RELATORIOS, FOTOS] : [RELATORIOS, ...TELAS_COM_BANCO];

function PxDrawerContent(props: DrawerContentComponentProps) {
  const { sessao } = useAuth();
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 48 }}
    >
      <View className="mb-6 px-4">
        <Text className="font-sans-semibold text-2xl text-paper">
          Px <Text className="text-volt">GYM</Text>
        </Text>
        <Text className="mt-1 font-sans text-sm text-fog">
          {displayName(sessao)}
        </Text>
      </View>
      {MENU.map(({ rota, rotulo, Icone }) => (
        <DrawerItem
          key={rota}
          label={rotulo}
          labelStyle={{
            color: colors.paperForeground,
            fontFamily: "Geist_500Medium",
            fontSize: 14,
          }}
          icon={({ size }) => (
            <Icone size={size ?? 20} color={colors.fogMuted} />
          )}
          onPress={() => props.navigation.navigate(rota)}
        />
      ))}
    </DrawerContentScrollView>
  );
}

export default function AppLayout() {
  // Área logada montada = sessão garantida (Stack.Protected no layout raiz).
  useWorkoutSync();

  return (
    <Drawer
      drawerContent={(props) => <PxDrawerContent {...props} />}
      // Voltar (seta ou botão do Android) retorna à tela anterior de verdade,
      // não sempre pro início — ex.: câmera volta pra Fotos.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: {
          backgroundColor: colors.inkSurface,
          width: 288,
        },
        sceneStyle: { backgroundColor: colors.inkGround },
      }}
    >
      {/* No modo mock só o relatório do ciclo existe: o resto depende do
          SQLite/Supabase e nem entra na navegação. */}
      <Drawer.Protected guard={!MODO_MOCK}>
        <Drawer.Screen name="(tabs)" />
      </Drawer.Protected>
      <Drawer.Screen name="relatorios" />
      <Drawer.Screen name="fotos" />
      <Drawer.Screen name="camera-demo" options={{ swipeEnabled: false }} />
      <Drawer.Protected guard={!MODO_MOCK}>
        <Drawer.Screen name="progresso" />
        <Drawer.Screen name="avaliacoes" />
        <Drawer.Screen name="configuracoes" />
        <Drawer.Screen name="academias" />
        <Drawer.Screen name="camera" options={{ swipeEnabled: false }} />
        <Drawer.Screen name="scanner" options={{ swipeEnabled: false }} />
      </Drawer.Protected>
    </Drawer>
  );
}
