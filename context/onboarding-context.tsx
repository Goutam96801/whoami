import React, { createContext, useContext, useMemo, useState } from "react";

export type Gender = "male" | "female" | "other";

export type OnboardingDraft = {
  username: string;
  password: string;
  confirmPassword: string;
  gender: Gender | null;
  dateOfBirth: string;
  profilePhoto: string;
  interests: string[];
};

type OnboardingContextValue = {
  draft: OnboardingDraft;
  updateDraft: (updates: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
};

const createDraft = (): OnboardingDraft => ({
  username: "",
  password: "",
  confirmPassword: "",
  gender: null,
  dateOfBirth: "",
  profilePhoto: "",
  interests: [],
});

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [draft, setDraft] = useState<OnboardingDraft>(createDraft());

  const updateDraft = (updates: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const resetDraft = () => {
    setDraft(createDraft());
  };

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      resetDraft,
    }),
    [draft],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
};
