import { Pressable, Text, View } from "react-native";

type Option<T extends string | number> = { value: T; label: string };

/**
 * Escolha por pílulas (um toque, sem teclado). `multiple` deixa marcar
 * várias; aí `value` é a lista das marcadas.
 */
export function ChoiceChips<T extends string | number>(
  props: { label: string; options: Option<T>[] } & (
    | { multiple?: false; value: T | null; onChange: (value: T) => void }
    | { multiple: true; value: T[]; onChange: (value: T[]) => void }
  ),
) {
  const isOn = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);

  function toggle(v: T) {
    if (props.multiple) {
      props.onChange(isOn(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  }

  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-xs text-fog">{props.label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {props.options.map((option) => {
          const on = isOn(option.value);
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => toggle(option.value)}
              accessibilityRole={props.multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked: on }}
              className={`rounded-full border px-4 py-2 active:scale-[0.98] ${
                on ? "border-volt bg-volt" : "border-hairline bg-glass-fill"
              }`}
            >
              <Text className={`font-sans-medium text-sm ${on ? "text-surface" : "text-paper"}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
