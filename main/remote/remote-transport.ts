/**
 * Remote transport sender — pushes events to the mobile client
 * via the relay server WebSocket connection.
 */

import type { TransportSender } from './transport'
import type { RelayClient } from './relay-client'

export class RemoteTransportSender implements TransportSender {
  constructor(private relayClient: RelayClient) {}

  send(channel: string, data: unknown): void {
    this.relayClient.pushToMobile(channel, data)
  }

  isDestroyed(): boolean {
    return !this.relayClient.isConnected()
  }
}
