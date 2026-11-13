export function canChangeAdminRole(actorId: string, targetId: string, promote: boolean, adminCount: number) {
  return promote || (actorId !== targetId && adminCount > 1);
}