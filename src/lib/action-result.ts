/** The result shape shared by every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFailure<T = undefined>(error: string): ActionResult<T> {
  return { ok: false, error };
}
