import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { ChevronRight, Timer } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { ProgressBar } from "@/components/progress-bar";
import { todayWorkout } from "@/lib/mock-data";

export default function TreinoScreen() {
  const progress = todayWorkout.progress();

  return (
    <Screen>
      <View className="mb-6">
        <Text className="font-sans text-sm text-fog">{todayWorkout.label}</Text>
        <Text className="font-sans-semibold text-3xl text-paper">
          {todayWorkout.name}
        </Text>
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Timer size={13} color={colors.fogMuted} />
            <Text className="font-mono text-xs text-fog">
              {todayWorkout.estimatedMinutes}
            </Text>
            <Text className="font-sans text-xs text-fog">min</Text>
          </View>
          <Text className="font-sans text-xs text-fog">
            {todayWorkout.focus}
          </Text>
        </View>
      </View>

      <View className="mb-5 flex-row items-center gap-3">
        <View className="flex-1">
          <ProgressBar fraction={progress.fraction} color={colors.voltLime} />
        </View>
        <View className="flex-row items-baseline gap-0.5">
          <Text className="font-mono text-sm text-volt">
            {progress.completedSets}
          </Text>
          <Text className="font-sans text-sm text-fog">/</Text>
          <Text className="font-mono text-sm text-fog">
            {progress.totalSets}
          </Text>
        </View>
      </View>

      <View className="gap-4">
        {todayWorkout.exercises.map((exercise) => {
          const done = exercise.sets.filter((s) => s.completed).length;
          return (
            <Link
              key={exercise.id}
              href={{
                pathname: "/treino/[exercicioId]",
                params: { exercicioId: exercise.id },
              }}
              asChild
            >
              <Pressable className="active:scale-[0.99]">
                <GlassCard>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="font-sans text-xs text-fog">
                        {exercise.muscleGroup}
                      </Text>
                      <Text className="mt-0.5 font-sans-semibold text-base text-paper">
                        {exercise.name}
                      </Text>
                      <View className="mt-2 flex-row items-center gap-1">
                        <Text className="font-mono text-xs text-paper">
                          {done}
                        </Text>
                        <Text className="font-sans text-xs text-fog">de</Text>
                        <Text className="font-mono text-xs text-fog">
                          {exercise.sets.length}
                        </Text>
                        <Text className="font-sans text-xs text-fog">
                          séries
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.fogMuted} />
                  </View>
                </GlassCard>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Screen>
  );
}
