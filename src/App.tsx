import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onSuccess: (data, query) => {
      console.log(`[query:success] ${query.queryKey.join("/")}`, data);
    },
    onError: (error, query) => {
      console.error(`[query:error] ${query.queryKey.join("/")}`, error);
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, _variables, _context, mutation) => {
      console.log(
        `[mutation:success] ${mutation.options.mutationKey ?? "anonymous"}`,
        data,
      );
    },
    onError: (error, _variables, _context, mutation) => {
      console.error(
        `[mutation:error] ${mutation.options.mutationKey ?? "anonymous"}`,
        error,
      );
    },
    onMutate: (_variables, mutation) => {
      console.log(
        `[mutation:start] ${mutation.options.mutationKey ?? "anonymous"}`,
        _variables,
      );
    },
  }),
});
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
