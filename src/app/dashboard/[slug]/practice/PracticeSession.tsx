"use client";

import { useState } from "react";
import Link from "next/link";
import type { Exercise } from "@/lib/exercises";
import { submitAnswerAction } from "./actions";

export function PracticeSession({
  languageId,
  languageSlug,
  exercises,
}: {
  languageId: string;
  languageSlug: string;
  exercises: Exercise[];
}) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"answering" | "feedback">("answering");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>(
    exercises[0]?.kind === "reconstruction" ? exercises[0].tokens : [],
  );

  const current = exercises[index];

  if (!current) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Session terminée</h1>
        <p className="mt-2 text-muted-foreground">
          {score} / {exercises.length} bonnes réponses.
        </p>
        <Link
          href={`/dashboard/${languageSlug}`}
          className="mt-6 inline-block rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  async function answer(correct: boolean, answerValue: string) {
    setWasCorrect(correct);
    setSelected(answerValue);
    setPhase("feedback");
    if (correct) setScore((s) => s + 1);
    await submitAnswerAction(languageId, current.pillar, current.itemId, correct);
  }

  function next() {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setPhase("answering");
    setSelected(null);
    setPlaced([]);
    const nextExercise = exercises[nextIndex];
    setRemaining(nextExercise?.kind === "reconstruction" ? nextExercise.tokens : []);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <p className="text-sm text-muted-foreground">
        {index + 1} / {exercises.length}
      </p>

      {current.kind === "qcm" ? (
        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight">{current.prompt}</h1>
          {current.promptTransliteration && (
            <p className="mt-1 text-muted-foreground">{current.promptTransliteration}</p>
          )}
          {current.hint && <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>}

          <div className="mt-6 grid gap-3">
            {current.options.map((option) => {
              const isSelected = selected === option;
              const isCorrectOption = option === current.correctAnswer;
              const showState = phase === "feedback";
              return (
                <button
                  key={option}
                  disabled={phase === "feedback"}
                  onClick={() => answer(option === current.correctAnswer, option)}
                  className={`rounded-[var(--radius-token)] border px-4 py-3 text-left transition-colors ${
                    showState && isCorrectOption
                      ? "border-accent bg-accent/10"
                      : showState && isSelected
                        ? "border-red-500/60 bg-red-500/10"
                        : "border-border"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <h1 className="text-xl font-semibold tracking-tight">Reconstitue la phrase</h1>
          <p className="mt-1 text-muted-foreground">« {current.translationHint} »</p>

          <div className="mt-6 min-h-16 rounded-[var(--radius-token)] border border-border p-3">
            <div className="flex flex-wrap gap-2">
              {placed.map((token, i) => (
                <button
                  key={`${token}-${i}`}
                  disabled={phase === "feedback"}
                  onClick={() => {
                    setPlaced(placed.filter((_, pi) => pi !== i));
                    setRemaining([...remaining, token]);
                  }}
                  className="rounded-[var(--radius-token)] bg-accent px-3 py-1.5 text-sm text-accent-foreground"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {remaining.map((token, i) => (
              <button
                key={`${token}-${i}`}
                disabled={phase === "feedback"}
                onClick={() => {
                  setRemaining(remaining.filter((_, ri) => ri !== i));
                  setPlaced([...placed, token]);
                }}
                className="rounded-[var(--radius-token)] border border-border px-3 py-1.5 text-sm"
              >
                {token}
              </button>
            ))}
          </div>

          {phase === "feedback" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Réponse : {current.correctSentence}
            </p>
          )}

          {phase === "answering" && remaining.length === 0 && (
            <button
              onClick={() => answer(placed.join(" ") === current.correctSentence, placed.join(" "))}
              className="mt-6 rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
            >
              Valider
            </button>
          )}
        </div>
      )}

      {phase === "feedback" && (
        <div className="mt-6">
          <p className={wasCorrect ? "text-accent" : "text-red-500"}>
            {wasCorrect ? "Bonne réponse." : "Pas tout à fait."}
          </p>
          <button
            onClick={next}
            className="mt-3 rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
