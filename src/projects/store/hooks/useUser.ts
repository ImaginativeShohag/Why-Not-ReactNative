import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "../api/user.api";
import { queryKeys } from "../utils/queryKeys";

export const useUserProfile = (id: number) => {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => fetchUserProfile(id),
  });
};
