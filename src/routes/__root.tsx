import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sileo'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-center" />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
})
