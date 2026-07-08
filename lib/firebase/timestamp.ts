import { Timestamp } from "firebase/firestore"

/** Converts a Firestore Timestamp field to epoch millis; tolerates a still-pending serverTimestamp() (null) during optimistic local reads. */
export function tsToMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  return Date.now()
}
