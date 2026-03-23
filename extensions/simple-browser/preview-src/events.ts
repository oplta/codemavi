/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function onceDocumentLoaded(f: () => codemavi) {
	if (document.readyState === 'loading' || document.readyState as string === 'uninitialized') {
		document.addEventListener('DOMContentLoaded', f);
	} else {
		f();
	}
}