import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@px/tokens";
import { pedirCampoVisivel } from "./keyboard-aware";

/** Campo de formulário no padrão do web: label pequena + input de vidro. */
export function Field({
  label,
  onFocus,
  onContentSizeChange,
  ...inputProps
}: TextInputProps & { label: string }) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-xs text-fog">{label}</Text>
      <TextInput
        placeholderTextColor={colors.fogMuted}
        className="rounded-px-md border border-hairline bg-glass-fill px-4 py-3 font-sans text-sm text-paper"
        {...inputProps}
        // a tela rola até o campo quando ele ganha foco ou cresce digitando
        onFocus={(e) => {
          pedirCampoVisivel();
          onFocus?.(e);
        }}
        onContentSizeChange={(e) => {
          pedirCampoVisivel();
          onContentSizeChange?.(e);
        }}
      />
    </View>
  );
}
