/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Code MaviCheckUpdateRespose } from './codemaviUpdateServiceTypes.js';



export interface IMaviUpdateService {
	readonly _serviceBrand: undefined;
	check: (explicit: boolean) => Promise<Code MaviCheckUpdateRespose>;
}


export const IMaviUpdateService = createDecorator<IMaviUpdateService>('Code MaviUpdateService');


// implemented by calling channel
export class Code MaviUpdateService implements IMaviUpdateService {

	readonly _serviceBrand: undefined;
	private readonly codemaviUpdateService: IMaviUpdateService;

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService, // (only usable on client side)
	) {
		// creates an IPC proxy to use metricsMainService.ts
		this.codemaviUpdateService = ProxyChannel.toService<IMaviUpdateService>(mainProcessService.getChannel('mavi-channel-update'));
	}


	// anything transmitted over a channel must be async even if it looks like it doesn't have to be
	check: IMaviUpdateService['check'] = async (explicit) => {
		const res = await this.codemaviUpdateService.check(explicit)
		return res
	}
}

registerSingleton(IMaviUpdateService, Code MaviUpdateService, InstantiationType.Eager);


