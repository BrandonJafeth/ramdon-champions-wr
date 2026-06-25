import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Users, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useGrupos, useCrearGrupo, useEliminarGrupo } from '@/hooks/useGrupos'

export const Route = createFileRoute('/')({
  component: Home,
})

function CrearGrupoDialog() {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const crear = useCrearGrupo()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed) return
    crear.mutate(trimmed, {
      onSuccess: () => {
        setNombre('')
        setOpen(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" />
        Nuevo grupo
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crear grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <Input
            placeholder="Nombre del grupo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
          {crear.isError && (
            <p className="text-xs text-destructive">{crear.error.message}</p>
          )}
          <Button type="submit" disabled={crear.isPending || !nombre.trim()}>
            {crear.isPending ? 'Creando...' : 'Crear'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GrupoCard({ id, nombre }: { id: string; nombre: string }) {
  const eliminar = useEliminarGrupo()

  return (
    <Card className="active:scale-[0.98] transition-transform">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link to="/grupos/$grupoId" params={{ grupoId: id }} className="flex-1">
            <CardTitle className="text-base leading-tight">{nombre}</CardTitle>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={eliminar.isPending}
            onClick={() => eliminar.mutate(id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Link
          to="/grupos/$grupoId"
          params={{ grupoId: id }}
          className="flex items-center gap-1.5 text-sm text-primary"
        >
          <Users className="h-3.5 w-3.5" />
          Ver grupo
        </Link>
      </CardContent>
    </Card>
  )
}

function Home() {
  const { data: grupos, isLoading, error } = useGrupos()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Wild Rift Randomizer</h1>
        <CrearGrupoDialog />
      </div>

      {isLoading && <LoadingState message="Cargando grupos..." />}
      {error && <ErrorState message={error.message} />}

      {grupos && grupos.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Sin grupos todavía.</p>
          <p className="text-xs mt-1">Creá uno para empezar.</p>
        </div>
      )}

      {grupos && grupos.length > 0 && (
        <div className="flex flex-col gap-3">
          {grupos.map((g) => (
            <GrupoCard key={g.id} id={g.id} nombre={g.nombre} />
          ))}
        </div>
      )}
    </main>
  )
}
