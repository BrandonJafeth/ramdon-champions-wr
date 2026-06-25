import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-destructive">
      <AlertCircle className="h-6 w-6" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  )
}
