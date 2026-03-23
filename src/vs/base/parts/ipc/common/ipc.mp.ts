/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../common/buffer.js';
import { Event } from '../../../common/event.js';
import { IDisposable } from '../../../common/lifecycle.js';
import { IMessagePassingProtocol, IPCClient } from './ipc.js';

/**
 * Declare minimal `MessageEvent` and `MessagePort` interfaces here
 * so that this utility can be used both from `browser` and
 * `electron-main` namespace where message ports are available.
 */

export interface MessageEvent {

	/**
	 * For our use we only consider `Uint8Array` a valid data transfer
	 * via message ports because our protocol implementation is buffer based.
	 */
	data: Uint8Array;
}

export interface MessagePort {

	addEventListener(type: 'message', listener: (this: MessagePort, e: MessageEvent) => unknown): codemavi;
	removeEventListener(type: 'message', listener: (this: MessagePort, e: MessageEvent) => unknown): codemavi;

	postMessage(message: Uint8Array): codemavi;

	start(): codemavi;
	close(): codemavi;
}

/**
 * The MessagePort `Protocol` leverages MessagePort style IPC communication
 * for the implementation of the `IMessagePassingProtocol`. That style of API
 * is a simple `onmessage` / `postMessage` pattern.
 */
export class Protocol implements IMessagePassingProtocol {

	readonly onMessage;

	constructor(private port: MessagePort) {
		this.onMessage = Event.fromDOMEventEmitter<VSBuffer>(this.port, 'message', (e: MessageEvent) => {
			if (e.data) {
				return VSBuffer.wrap(e.data);
			}
			return VSBuffer.alloc(0);
		});
		// we must call start() to ensure messages are flowing
		port.start();
	}

	send(message: VSBuffer): codemavi {
		this.port.postMessage(message.buffer);
	}

	disconnect(): codemavi {
		this.port.close();
	}
}

/**
 * An implementation of a `IPCClient` on top of MessagePort style IPC communication.
 */
export class Client extends IPCClient implements IDisposable {

	private protocol: Protocol;

	constructor(port: MessagePort, clientId: string) {
		const protocol = new Protocol(port);
		super(protocol, clientId);

		this.protocol = protocol;
	}

	override dispose(): codemavi {
		this.protocol.disconnect();

		super.dispose();
	}
}
