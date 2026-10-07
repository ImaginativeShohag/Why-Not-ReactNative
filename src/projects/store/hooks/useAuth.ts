import { useMutation } from "@tanstack/react-query";

import { useSession } from "../auth/useSession";
import type { LoginPayload, SignUpPayload } from "../models/Auth";

/**
 * Login is a POST/side effect, so it is a mutation — never a query, and the
 * credentials never become part of a cache key.
 */
export const useSignIn = () => {
  const { signIn } = useSession();
  return useMutation<void, unknown, LoginPayload>({ mutationFn: signIn });
};

export const useSignUp = () => {
  const { signUp } = useSession();
  return useMutation<void, unknown, SignUpPayload>({ mutationFn: signUp });
};
