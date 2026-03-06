/**
 * Remote API adapter.
 *
 * Implements the same ElectronAPI interface shape that the desktop renderer uses
 * (window.electronAPI), but routes all calls through the relay WebSocket client.
 *
 * This allows reusing all desktop Zustand stores and hooks unchanged —
 * they call window.electronAPI.* which transparently goes through the relay.
 */

import type { RelayWsClient } from './relay-ws-client'
import type { IpcResult, ElectronAPI, IpcAgentEvent } from '@shared/types/ipc'
import type { AppSettings } from '@shared/types/settings'

/**
 * Create a remote ElectronAPI backed by the relay WebSocket client.
 * Assign the result to `window.electronAPI` before mounting the React app.
 */
export function createRemoteAPI(client: RelayWsClient): ElectronAPI {
  return {
    agent: {
      start: (payload) => client.request('agent.start', payload),
      interrupt: (payload) => client.request('agent.interrupt', payload),
      uiAction: (payload) => client.request('agent.uiAction', payload),
      onStreamEvent: (callback: (event: IpcAgentEvent) => void) => {
        return client.onPush('agent:stream-event', callback as (data: unknown) => void)
      },
    },

    conversations: {
      list: () => client.request('conversations.list'),
      get: (id: string) => client.request('conversations.get', { id }),
      create: (title: string) => client.request('conversations.create', { title }),
      delete: (id: string) => client.request('conversations.delete', { id }),
      getMessages: (conversationId: string) =>
        client.request('conversations.getMessages', { conversationId }),
      onTitleUpdated: (callback) => {
        return client.onPush('conversation:title-updated', callback as (data: unknown) => void)
      },
    },

    settings: {
      get: () => client.request('settings.get'),
      set: (partial: Partial<AppSettings>) => client.request('settings.set', partial),
    },

    skills: {
      list: () => client.request('skills.list'),
      save: (payload) => client.request('skills.save', payload),
      update: (payload) => client.request('skills.update', payload),
      delete: (id: string) => client.request('skills.delete', { id }),
      toggle: (id: string) => client.request('skills.toggle', { id }),
      import: () => {
        // Import via native file dialog is not available on mobile
        return Promise.resolve({ data: [] } as IpcResult<any>)
      },
    },

    mcp: {
      list: () => client.request('mcp.list'),
      add: (name, config) => client.request('mcp.add', { name, config }),
      remove: (name) => client.request('mcp.remove', { name }),
      reconnect: (name) => client.request('mcp.reconnect', { name }),
    },

    uiWindow: {
      // Mobile has no separate UI window — these are no-ops
      onSchema: () => () => {},
      getSchema: () => Promise.resolve({ data: null } as any),
      action: () => Promise.resolve({ data: { status: 'ok' } } as any),
    },
  }
}
