/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';

export const ISharedProcessLifecycleService = createDecorator<ISharedProcessLifecycleService>('sharedProcessLifecycleService');

export interface ISharedProcessLifecycleService {

	readonly _serviceBrand: undefined;

	/**
	 * An event for when the application will shutdown
	 */
	readonly onWillShutdown: Event<codemavi>;
}

export class SharedProcessLifecycleService extends Disposable implements ISharedProcessLifecycleService {

	declare readonly _serviceBrand: undefined;

	private readonly _onWillShutdown = this._register(new Emitter<codemavi>());
	readonly onWillShutdown = this._onWillShutdown.event;

	constructor(
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	fireOnWillShutdown(): codemavi {
		this.logService.trace('Lifecycle#onWillShutdown.fire()');

		this._onWillShutdown.fire();
	}
}
