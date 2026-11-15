export const authProviders = ["google", "microsoft"] as const;
export type AuthProvider = (typeof authProviders)[number];