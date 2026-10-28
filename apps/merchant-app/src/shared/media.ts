import { API_URL } from "./config";

// The backend sends dish pictures as "/media/dishes/d1.jpg" (a file it serves itself) or a full https link.
// This turns the first kind into a full address for this phone.
export const mediaUrl = (image?: string): string | undefined => (image && image.startsWith("/") ? `${API_URL}${image}` : image);
export const isPhoto = (uri?: string) => !!uri && /^(https?:|data:image\/|file:|blob:)/.test(uri);
