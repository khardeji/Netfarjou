import { queryOptions } from '@tanstack/react-query';
import { getCatalogue, getAdminData } from './cinema.functions';
export const catalogueOptions = queryOptions({ queryKey: ['catalogue'], queryFn: () => getCatalogue(), staleTime: 30_000 });
export const adminOptions = queryOptions({ queryKey: ['admin'], queryFn: () => getAdminData(), staleTime: 10_000 });
export type Screening = Awaited<ReturnType<typeof getCatalogue>>[number];