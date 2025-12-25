type AuthSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
} | null;

export const authClient = {
  signIn: {
    email: async (_input?: {
      email?: string;
      password?: string;
    }) =>
      ({
        success: true,
        error: null as { message?: string } | null,
      }),
    social: async (_input?: {
      provider?: string;
      callbackURL?: string;
    }) =>
      ({
        success: true,
        error: null as { message?: string } | null,
      }),
    anonymous: async () => ({ success: true }),
  },
  signOut: async () => ({ success: true }),
  signUp: {
    email: async (_input?: {
      email?: string;
      password?: string;
      name?: string;
    }) =>
      ({
        success: true,
        error: null as { message?: string } | null,
      }),
  },
};

export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const signUp = authClient.signUp;

export function useSession(): { data: AuthSession; isPending: boolean } {
  return { data: null, isPending: false };
}
