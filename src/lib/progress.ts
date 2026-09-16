export type ProgressStatus = "a_apprendre" | "en_revision" | "maitrise";

export type ProgressSnapshot = {
  status: ProgressStatus;
  timesSeen: number;
  timesCorrect: number;
  nextReviewAt: Date;
};

const MAITRISE_THRESHOLD = 3;

/**
 * Répétition espacée simple : une mauvaise réponse rapproche la prochaine
 * révision, une bonne réponse l'éloigne ; la maîtrise s'acquiert après
 * plusieurs bonnes réponses cumulées (pas forcément consécutives).
 */
export function computeNextProgress(
  current: { status: ProgressStatus; times_seen: number; times_correct: number } | null,
  wasCorrect: boolean,
): ProgressSnapshot {
  const timesSeen = (current?.times_seen ?? 0) + 1;
  const timesCorrect = (current?.times_correct ?? 0) + (wasCorrect ? 1 : 0);

  let status: ProgressStatus;
  let intervalDays: number;

  if (!wasCorrect) {
    status = "en_revision";
    intervalDays = 1;
  } else if (timesCorrect >= MAITRISE_THRESHOLD) {
    status = "maitrise";
    intervalDays = 30;
  } else {
    status = "en_revision";
    intervalDays = 3;
  }

  return {
    status,
    timesSeen,
    timesCorrect,
    nextReviewAt: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000),
  };
}
