// Types shared between the Worker API and the React client. Keeping the API
// contract in one place avoids drift between server responses and client state.

export interface UserProfile {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  isPrivate: boolean;
  createdAt: number;
}

export interface ApiError {
  error: string;
}

export interface Outfit {
  id: string;
  userId: string;
  collectionId: string | null;
  photoKey: string;
  cutoutKey: string | null;
  caption: string | null;
  aesthetic: string | null;
  occasion: string | null;
  eloOverall: number;
  eloAesthetic: number;
  eloOccasion: number;
  createdAt: number;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
}

// URL for an outfit's authenticated media (photo, or cutout variant).
export function outfitImageUrl(outfitId: string, variant?: "cutout"): string {
  const q = variant ? `?variant=${variant}` : "";
  return `/api/media/outfit/${outfitId}${q}`;
}
