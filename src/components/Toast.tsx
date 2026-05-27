import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem { id: string; message: string; type: ToastType }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void }

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID()
    setItems(prev => [...prev, { id, message: msg, type }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {items.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
          style={{ width: 'min(90vw, 400px)' }}
        >
          {items.map(item => (
            <div
              key={item.id}
              className={`w-full px-5 py-3 border-2 border-ink font-archivo text-sm font-medium shadow-[4px_4px_0_#000] animate-fade-slide-up ${
                item.type === 'error'
                  ? 'bg-red text-paper'
                  : item.type === 'info'
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink'
              }`}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}
