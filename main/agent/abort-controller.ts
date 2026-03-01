// Registry of AbortControllers keyed by sessionId
const registry = new Map<string, AbortController>()

export const AbortRegistry = {
  register(sessionId: string, controller: AbortController): void {
    registry.set(sessionId, controller)
  },

  interrupt(sessionId: string): boolean {
    const controller = registry.get(sessionId)
    if (!controller) return false
    controller.abort()
    return true
  },

  unregister(sessionId: string): void {
    registry.delete(sessionId)
  },

  has(sessionId: string): boolean {
    return registry.has(sessionId)
  },

  interruptAll(): void {
    for (const controller of registry.values()) {
      controller.abort()
    }
    registry.clear()
  },
}
