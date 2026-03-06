/**
 * Transport abstraction layer.
 *
 * All push-style communication from the main process to a client
 * (Electron renderer or remote mobile) goes through this interface.
 */

export interface TransportSender {
  /** Push an event to the client on the given channel. */
  send(channel: string, data: unknown): void
  /** Whether the underlying connection has been destroyed / closed. */
  isDestroyed(): boolean
}

/**
 * Wraps an Electron WebContents as a TransportSender.
 * This preserves the existing IPC behaviour for the desktop renderer.
 */
export class ElectronTransportSender implements TransportSender {
  constructor(private webContents: Electron.WebContents) {}

  send(channel: string, data: unknown): void {
    this.webContents.send(channel, data)
  }

  isDestroyed(): boolean {
    return this.webContents.isDestroyed()
  }
}
