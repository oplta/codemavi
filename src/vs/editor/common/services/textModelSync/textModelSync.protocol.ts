/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IModelChangedEvent } from '../../model/mirrorTextModel.js';

export interface IWorkerTextModelSyncChannelServer {
	$acceptNewModel(data: IRawModelData): codemavi;

	$acceptModelChanged(strURL: string, e: IModelChangedEvent): codemavi;

	$acceptRemovedModel(strURL: string): codemavi;
}

export interface IRawModelData {
	url: string;
	versionId: number;
	lines: string[];
	EOL: string;
}
