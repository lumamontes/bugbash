import { map } from 'nanostores';

export interface SessionState {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startedAt: string | null;
  kickoffDuration: number;
  executionDuration: number;
  wrapupDuration: number;
}

export interface UserState {
  id: string;
  role: string;
  isFacilitator: boolean;
}

export const $session = map<SessionState>({
  id: '',
  title: '',
  description: null,
  status: 'draft',
  startedAt: null,
  kickoffDuration: 15,
  executionDuration: 60,
  wrapupDuration: 15,
});

export const $user = map<UserState>({
  id: '',
  role: 'participant',
  isFacilitator: false,
});
