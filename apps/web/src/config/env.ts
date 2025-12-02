export const env = {
  CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string,
  API_URL: import.meta.env.VITE_API_URL || '/api',
};
