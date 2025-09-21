// Legacy context file - now redirects to Redux
// This file exists only for backward compatibility
// All functionality has been moved to Redux

export type Location =
  | 'gym'
  | 'cafeteria'
  | 'home room'
  | 'library'
  | 'science lab'
  | 'school yard'
  | 'bathroom';

// Re-export Redux hook
export { useGame } from '../hooks/useGame';