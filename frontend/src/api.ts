// In development, we use '/api' which is proxied by Vite to the backend.
// In production, you can either use a full URL in VITE_API_URL_PROD or keep '/api' if your hosting handles it.
// export const API_URL = import.meta.env.VITE_API_URL_PROD || '/api';



export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("API_URL is not defined. Check VITE_API_URL_PROD");
}
