import { LoginPayload } from "@/src/projects/store/models/Auth";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { loginUser } from "../api/auth.api";

type LoginResponse = {
  token: string;
};

/**
 * Login is a POST/side effect, so it is a mutation, not a query.
 * `isPending` / `error` / `isSuccess` replace the SwiftUI `viewModel.state`
 * (loading / error / data) triple.
 */
export const useLogin = () => {
  return useMutation<LoginResponse, unknown, LoginPayload>({
    mutationFn: (credentials) => loginUser(credentials),
  });
};

/** Maps an unknown mutation error to a user facing message. */
export const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;

  if (isAxiosError(error)) {
    if (error.response) {
      // FakeStoreAPI answers with a plain text body, e.g. "username or password is incorrect".
      const data = error.response.data;
      const message = typeof data === "string" ? data.trim() : data?.message;

      return message || `Login failed (${error.response.status}).`;
    }

    return "Cannot reach the server. Please check your connection.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong. Please try again.";
};

// export const useUpdateUser = (id: string) => {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: (payload: any) => updateUser(id, payload),
//     onSuccess: () => {
//       // Invalidate cache to refetch
//       queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
//     },
//   });
// };
