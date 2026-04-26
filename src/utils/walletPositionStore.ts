/**
 * Module-level singleton for the wallet HUD's on-screen position.
 *
 * The wallet is measured by `GameHUD` on layout via `measureInWindow`.
 * Imperative consumers (SparkController arcs from JokerCard activation,
 * TransactionModal, etc.) can read the current position to use as an arc
 * target without prop-drilling through the tree.
 *
 * Mirrors the `SparkController` / `JuiceController` / `MusicController`
 * pattern — no Redux, no React state, just a stable module singleton.
 */

interface WalletPosition {
  x: number;
  y: number;
}

let currentPosition: WalletPosition | null = null;

export function setWalletPosition(position: WalletPosition | null): void {
  currentPosition = position;
}

export function getWalletPosition(): WalletPosition | null {
  return currentPosition;
}

/**
 * Best-effort wallet position. If the HUD hasn't measured yet, falls back
 * to the top-left approximate HUD position. Callers that want to skip the
 * arc entirely when unmeasured should call `getWalletPosition()` directly
 * and null-check.
 */
export function getWalletPositionOrDefault(
  screenWidth: number
): WalletPosition {
  return currentPosition ?? { x: screenWidth * 0.2, y: 80 };
}
