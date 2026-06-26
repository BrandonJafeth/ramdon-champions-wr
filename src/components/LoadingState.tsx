import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
