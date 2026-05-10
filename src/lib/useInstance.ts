import { useQuery } from "@tanstack/react-query";
import { getGraphQLClient } from "./graphql";
import { InstanceQuery } from "./queries";

export function useInstance() {
  const { data } = useQuery({
    queryKey: ["instance"],
    queryFn: () => getGraphQLClient().request(InstanceQuery, {}),
    staleTime: 60_000,
  });
  return data?.instance.title ?? "uchat";
}
