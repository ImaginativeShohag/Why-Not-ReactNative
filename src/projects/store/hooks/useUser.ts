import { useQuery } from "@tanstack/react-query";

import { fetchUserProfile } from "../api/user.api";
import { queryKeys } from "../utils/queryKeys";

export const useUserProfile = (id: number | undefined) =>
  useQuery({
    queryKey: queryKeys.user.profile(id ?? 0),
    queryFn: () => fetchUserProfile(id ?? 0),
    enabled: id !== undefined,
  });
