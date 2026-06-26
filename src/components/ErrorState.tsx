import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12">
      <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <p className="text-sm text-destructive text-center max-w-xs">{message}</p>
    </div>
  )
}
