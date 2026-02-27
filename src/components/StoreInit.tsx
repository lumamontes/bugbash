import { useEffect } from 'react';
import { $session, type SessionState, $user, type UserState } from '../stores/sessionStore';
import { initBugs, type BugItem } from '../stores/sseStore';

interface Props {
  session: SessionState;
  user: UserState;
  initialBugs?: BugItem[];
}

/** Invisible component that initializes nanostores from server-rendered data. */
export default function StoreInit({ session, user, initialBugs }: Props) {
  useEffect(() => {
    $session.set(session);
    $user.set(user);
    if (initialBugs) initBugs(initialBugs);
  }, []);

  return null;
}
