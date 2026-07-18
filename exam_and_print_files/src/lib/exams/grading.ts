/**
 * Centralized grading scale configuration and grade calculation.
 */
export const GRADING_SCALE = [
  { min: 80, max: 100, grade: "A+" },
  { min: 70, max: 79.999, grade: "A" },
  { min: 60, max: 69.999, grade: "A-" },
  { min: 50, max: 59.999, grade: "B" },
  { min: 40, max: 49.999, grade: "C" },
  { min: 33, max: 39.999, grade: "D" },
  { min: 0, max: 32.999, grade: "F" },
];

/**
 * Calculates grade based on percentage mark.
 */
export function calculateGrade(percentage: number): string {
  const normPercent = Math.max(0, Math.min(100, percentage));
  for (const range of GRADING_SCALE) {
    if (normPercent >= range.min && normPercent <= range.max) {
      return range.grade;
    }
  }
  // Fallback for edge cases
  if (normPercent >= 100) return "A+";
  return "F";
}

/**
 * Determines PASS / FAIL / ABSENT state.
 */
export function calculatePassFailStatus(
  obtainedMarks: number | null,
  passMarks: number,
  attendanceStatus: "PRESENT" | "ABSENT"
): "PASS" | "FAIL" | "ABSENT" {
  if (attendanceStatus === "ABSENT") {
    return "ABSENT";
  }
  if (obtainedMarks === null) {
    return "FAIL"; // default to fail if present but mark not entered
  }
  return obtainedMarks >= passMarks ? "PASS" : "FAIL";
}

interface ResultItem {
  id?: string;
  obtained_marks: number | null;
  attendance_status: "PRESENT" | "ABSENT";
}

/**
 * Computes standard competition ranks for PRESENT students:
 * Ties receive the same rank, and the next rank is incremented accordingly (e.g. 1, 1, 3).
 * ABSENT students receive null rank.
 */
export function calculateCompetitionRanks<T extends ResultItem>(results: T[]): Array<T & { rank: number | null }> {
  // Separate present and absent
  const present = results.filter(r => r.attendance_status === "PRESENT" && r.obtained_marks !== null);
  const absent = results.filter(r => r.attendance_status === "ABSENT" || r.obtained_marks === null);

  // Sort present descending
  const sortedPresent = [...present].sort((a, b) => (b.obtained_marks || 0) - (a.obtained_marks || 0));

  const rankMap = new Map<T, number | null>();

  sortedPresent.forEach((item, index) => {
    let rank = index + 1;
    if (index > 0) {
      const prev = sortedPresent[index - 1];
      if (item.obtained_marks === prev.obtained_marks) {
        // Equal marks get equal rank. Find the rank of the first item with these marks.
        let firstTieIndex = index;
        while (firstTieIndex > 0 && sortedPresent[firstTieIndex - 1].obtained_marks === item.obtained_marks) {
          firstTieIndex--;
        }
        rank = firstTieIndex + 1;
      }
    }
    rankMap.set(item, rank);
  });

  absent.forEach((item) => {
    rankMap.set(item, null);
  });

  return results.map((item) => {
    return {
      ...item,
      rank: rankMap.get(item) ?? null,
    };
  });
}
