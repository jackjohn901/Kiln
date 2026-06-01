export interface WebhookState {
  status: "unknown" | "ok" | "failing" | "degraded";
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorMessage: string | null;
}

const state: WebhookState = {
  status: "unknown",
  consecutiveFailures: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastErrorMessage: null,
};

export function getWebhookState(): Readonly<WebhookState> {
  return { ...state };
}

export function recordWebhookSuccess(): void {
  state.status = "ok";
  state.consecutiveFailures = 0;
  state.lastSuccessAt = new Date().toISOString();
  state.lastErrorMessage = null;
}

export function recordWebhookFailure(errorMessage: string): void {
  state.consecutiveFailures += 1;
  state.lastFailureAt = new Date().toISOString();
  state.lastErrorMessage = errorMessage;
  state.status =
    state.consecutiveFailures >= WEBHOOK_ALERT_THRESHOLD ? "degraded" : "failing";
}

export const WEBHOOK_ALERT_THRESHOLD = 3;
