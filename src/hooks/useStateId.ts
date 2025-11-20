/**
 * Hook to get current state ID
 * Convenience hook for components to easily access current state ID
 */
import { useStateContext } from "../contexts/StateContext";

export const useStateId = (): string | null => {
  const { currentState } = useStateContext();
  return currentState?.id ?? null;
};

