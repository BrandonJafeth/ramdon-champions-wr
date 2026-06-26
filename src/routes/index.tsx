import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Users, Plus, ChevronRight, Trash2, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

function CrearGrupoDialog({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
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
      <DialogTrigger
        render={
          variant === 'icon' ? (
            <Button size="icon" className="h-10 w-10 rounded-xl shrink-0" />
          ) : (
            <Button className="h-11 px-5 rounded-xl" />
          )
        }
      >
        {variant === 'icon' ? (
          <Plus className="h-5 w-5" />
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Crear grupo
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Nuevo grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <Input
            placeholder="Nombre del grupo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            className="h-11"
          />
          {crear.isError && (
            <p className="text-xs text-destructive">{crear.error.message}</p>
          )}
          <Button type="submit" disabled={crear.isPending || !nombre.trim()} className="h-11">
            {crear.isPending ? 'Creando...' : 'Crear grupo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function GrupoCard({ id, nombre }: { id: string; nombre: string }) {
  const eliminar = useEliminarGrupo()

  return (
    <div className="flex items-stretch rounded-xl border border-border bg-card overflow-hidden active:scale-[0.99] transition-transform">
      <Link
        to="/grupos/$grupoId"
        params={{ grupoId: id }}
        className="flex flex-1 items-center gap-3.5 px-4 py-4 min-w-0"
      >
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <span className="font-display text-sm font-bold text-primary">{getInitials(nombre)}</span>
        </div>
        <span className="font-display font-semibold text-base truncate flex-1">{nombre}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
      <button
        type="button"
        className="px-4 flex items-center border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        disabled={eliminar.isPending}
        onClick={() => eliminar.mutate(id)}
        aria-label={`Eliminar ${nombre}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function Home() {
  const { data: grupos, isLoading, error } = useGrupos()

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-14 pb-12">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Swords className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-[0.18em] uppercase">
                Wild Rift
              </span>
            </div>
            <h1 className="font-display text-4xl font-bold leading-none tracking-tight">
              Randomizer
            </h1>
          </div>
          <CrearGrupoDialog variant="icon" />
        </div>

        {isLoading && <LoadingState message="Cargando grupos..." />}
        {error && <ErrorState message={error.message} />}

        {!isLoading && !error && grupos?.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-display font-semibold text-base mb-1">Sin grupos todavía</p>
            <p className="text-sm text-muted-foreground mb-6">Creá un grupo para empezar</p>
            <CrearGrupoDialog variant="full" />
          </div>
        )}

        {grupos && grupos.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-0.5">
              Grupos · {grupos.length}
            </p>
            {grupos.map((g) => (
              <GrupoCard key={g.id} id={g.id} nombre={g.nombre} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
