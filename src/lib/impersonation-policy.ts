/** Capabilities remain explicit: future support writes must be separately authorized and audited. */
export function userViewCanWrite(active: boolean): boolean {
  return !active;
}

export function canInspectUser(actorId: string, actorIsAdmin: boolean, targetId: string, targetIsAdmin: boolean): boolean {
  return actorIsAdmin && actorId !== targetId && !targetIsAdmin;
}