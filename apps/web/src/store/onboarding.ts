import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  setOnboardingCompleted: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      setOnboardingCompleted: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'menucraft-onboarding',
    }
  )
);

export function useHasCompletedOnboarding() {
  return useOnboardingStore((state) => state.hasCompletedOnboarding);
}

export function useSetOnboardingCompleted() {
  return useOnboardingStore((state) => state.setOnboardingCompleted);
}
