'use client'

import dynamic from 'next/dynamic'
import { DashboardSkeleton } from '@/components/features/dashboard/DashboardSkeleton'

// Dynamic import com ssr: false para evitar erro "No QueryClient set"
// O componente usa React Query hooks que precisam do QueryClientProvider,
// que só está disponível no cliente
const DashboardClientWrapper = dynamic(
  () => import('./DashboardClientWrapper').then(mod => ({ default: mod.DashboardClientWrapper })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)

export function DashboardClientLoader({ initialData }: { initialData?: any }) {
  return <DashboardClientWrapper initialData={initialData} />
}
