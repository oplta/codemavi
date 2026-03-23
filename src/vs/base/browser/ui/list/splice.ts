/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISpliceable } from '../../../common/sequence.js';

export interface ISpreadSpliceable<T> {
	splice(start: number, deleteCount: number, ...elements: T[]): codemavi;
}

export class CombinedSpliceable<T> implements ISpliceable<T> {

	constructor(private spliceables: ISpliceable<T>[]) { }

	splice(start: number, deleteCount: number, elements: T[]): codemavi {
		this.spliceables.forEach(s => s.splice(start, deleteCount, elements));
	}
}