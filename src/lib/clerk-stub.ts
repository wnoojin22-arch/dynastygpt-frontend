/**
 * Clerk stub for local development without auth.
 * Re-exports mock hooks/components so files compile without @clerk/nextjs runtime.
 */

const mockUser = {
  id: "dev_user",
  unsafeMetadata: {} as Record<string, unknown>,
  update: async () => {},
};

export function useUser() {
  return { user: mockUser as any, isLoaded: true, isSignedIn: false };
}

export function useAuth() {
  return { isSignedIn: false, userId: null };
}

export function UserButton(_props?: any) {
  return null;
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function clerkMiddleware() {
  return () => {};
}

export function createRouteMatcher(_routes: string[]) {
  return () => true;
}
