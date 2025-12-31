import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/generated/api-types";

/**
 * Get stored user from localStorage
 */
function getStoredUser(): { id: string; role: string } | null {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Auth middleware - uses x-user-id and x-user-role headers
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const user = getStoredUser();
    if (user) {
      request.headers.set("x-user-id", user.id);
      request.headers.set("x-user-role", user.role);
    }
    return request;
  },
  async onResponse({ response }) {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Optionally redirect to login
      // window.location.href = '/login';
    }
    return response;
  },
};

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
});

// Register middleware
api.use(authMiddleware);

export default api;
