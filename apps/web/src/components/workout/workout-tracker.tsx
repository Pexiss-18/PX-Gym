"use client";

import { useMemo, useState } from "react";
import { WorkoutHeader } from "@/components/workout/workout-header";
import { ExerciseCard } from "@/components/workout/exercise-card";
import type { LiveSet, WorkoutDay } from "@/lib/types";

export function WorkoutTracker({ workout }: { workout: WorkoutDay }) {
  const [exercises, setExercises] = useState(() =>
    workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map<LiveSet>((set) => ({
        setNumber: set.setNumber,
        targetReps: set.targetReps,
        previousLoadKg: set.previousLoadKg,
        currentLoadKg: set.targetLoadKg,
        completed: set.completed,
      })),
    })),
  );

  const { completedSets, totalSets } = useMemo(() => {
    let completed = 0;
    let total = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        total += 1;
        if (set.completed) completed += 1;
      }
    }
    return { completedSets: completed, totalSets: total };
  }, [exercises]);

  function toggleSet(exerciseId: string, setNumber: number) {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.setNumber === setNumber ? { ...set, completed: !set.completed } : set,
              ),
            },
      ),
    );
  }

  function changeLoad(exerciseId: string, setNumber: number, delta: number) {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.setNumber === setNumber
                  ? { ...set, currentLoadKg: Math.max(0, set.currentLoadKg + delta) }
                  : set,
              ),
            },
      ),
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <WorkoutHeader
        label={workout.label}
        name={workout.name}
        focus={workout.focus}
        estimatedMinutes={workout.estimatedMinutes}
        completedSets={completedSets}
        totalSets={totalSets}
      />

      <div className="flex flex-col gap-3">
        {exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            defaultOpen={i === 0}
            onToggleSet={(setNumber) => toggleSet(exercise.id, setNumber)}
            onChangeLoad={(setNumber, delta) => changeLoad(exercise.id, setNumber, delta)}
          />
        ))}
      </div>
    </div>
  );
}
