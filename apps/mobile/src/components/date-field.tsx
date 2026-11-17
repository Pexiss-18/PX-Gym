import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { colors } from "@px/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** AAAA-MM-DD → Date local (sem fuso: meia-noite do próprio dia). */
function isoParaData(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Date → AAAA-MM-DD (o formato que o domínio e o banco esperam). */
function dataParaIso(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/** AAAA-MM-DD → DD/MM/AAAA, do jeito que se lê no Brasil. */
export function isoParaBr(iso: string): string {
  const d = isoParaData(iso);
  return d ? `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}` : "";
}

/**
 * Campo de data com seletor, no lugar de digitar. Guarda AAAA-MM-DD
 * (`value`/`onChange`) e mostra DD/MM/AAAA. No iPhone abre uma folha com a
 * roleta e o botão Confirmar; no Android, o calendário nativo.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = "Escolher data",
  initialDate,
  minimumDate,
  maximumDate = new Date(),
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Onde o seletor abre quando ainda não há valor. */
  initialDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState(false);
  const atual = isoParaData(value) ?? initialDate ?? maximumDate;
  const [rascunho, setRascunho] = useState(atual);

  function abrir() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: atual,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: (evento, data) => {
          if (evento.type === "set" && data) onChange(dataParaIso(data));
        },
      });
      return;
    }
    setRascunho(atual);
    setAberto(true);
  }

  function confirmar() {
    onChange(dataParaIso(rascunho));
    setAberto(false);
  }

  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-xs text-fog">{label}</Text>
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? isoParaBr(value) : "nenhuma data escolhida"}`}
        accessibilityHint="Abre o seletor de data"
        className="flex-row items-center justify-between rounded-px-md border border-hairline bg-glass-fill px-4 py-3"
      >
        <Text className={`font-sans text-sm ${value ? "text-paper" : "text-fog"}`}>
          {value ? isoParaBr(value) : placeholder}
        </Text>
        <CalendarDays size={18} color={colors.fogMuted} />
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal
          visible={aberto}
          transparent
          animationType="slide"
          onRequestClose={() => setAberto(false)}
        >
          <Pressable
            className="flex-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={() => setAberto(false)}
            accessibilityLabel="Fechar sem mudar a data"
          />
          <View
            className="rounded-t-3xl border-t border-hairline px-5 pt-4"
            style={{ backgroundColor: colors.inkSurface, paddingBottom: insets.bottom + 16 }}
          >
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => setAberto(false)} hitSlop={12} accessibilityRole="button">
                <Text className="font-sans-medium text-base text-fog">Cancelar</Text>
              </Pressable>
              <Text className="font-sans-semibold text-base text-paper">{label.replace(/\s*\*$/, "")}</Text>
              <View style={{ width: 64 }} />
            </View>
            <DateTimePicker
              value={rascunho}
              mode="date"
              display="spinner"
              locale="pt-BR"
              themeVariant="dark"
              textColor={colors.paperForeground}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, data) => data && setRascunho(data)}
            />
            <Pressable
              onPress={confirmar}
              accessibilityRole="button"
              className="mt-2 min-h-12 flex-row items-center justify-center rounded-full bg-volt active:scale-[0.98]"
            >
              <Text className="font-sans-semibold text-base text-surface">
                Confirmar {isoParaBr(dataParaIso(rascunho))}
              </Text>
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
