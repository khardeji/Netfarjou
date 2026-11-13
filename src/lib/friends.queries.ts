import { queryOptions } from '@tanstack/react-query';
import { getFriends } from './friends.functions';
export const friendsOptions = queryOptions({ queryKey: ['friends'], queryFn: () => getFriends(), refetchInterval: 10000 });