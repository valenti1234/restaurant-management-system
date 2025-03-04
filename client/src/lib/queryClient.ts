import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleError } from "./error";
import { isErrorResponse } from "@shared/errors";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone the response before reading it
    const clonedRes = res.clone();

    try {
      const data = await res.json();
      if (isErrorResponse(data)) {
        throw data;
      }
      throw new Error(data.message || JSON.stringify(data));
    } catch (e) {
      // If JSON parsing fails, use the cloned response to get text
      if (!(e as any).message) {
        const text = await clonedRes.text();
        throw new Error(text);
      }
      throw e;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return res.json();
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});