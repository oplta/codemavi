/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from './event.js';

export class IMEImpl {

	private readonly _onDidChange = new Emitter<codemavi>();
	public readonly onDidChange = this._onDidChange.event;

	private _enabled = true;

	public get enabled() {
		return this._enabled;
	}

	/**
	 * Enable IME
	 */
	public enable(): codemavi {
		this._enabled = true;
		this._onDidChange.fire();
	}

	/**
	 * Disable IME
	 */
	public disable(): codemavi {
		this._enabled = false;
		this._onDidChange.fire();
	}
}

export const IME = new IMEImpl();
