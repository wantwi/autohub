import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/lib/api'

/** @returns {import('@tanstack/react-query').UseQueryResult<string[]>} */
export function usePartCategories() {
  return useQuery({
    queryKey: ['parts', 'categories'],
    queryFn: () => apiJson('/parts/categories'),
    staleTime: 60 * 60 * 1000,
  })
}
