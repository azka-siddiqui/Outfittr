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
