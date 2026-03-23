/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode } from '../../../../base/browser/fastDomNode.js';
import { Position } from '../../../common/core/position.js';
import { IEditorAriaOptions } from '../../editorBrowser.js';
import { ViewPart } from '../../view/viewPart.js';

export abstract class AbstractEditContext extends ViewPart {
	abstract domNode: FastDomNode<HTMLElement>;
	abstract focus(): codemavi;
	abstract isFocused(): boolean;
	abstract refreshFocusState(): codemavi;
	abstract setAriaOptions(options: IEditorAriaOptions): codemavi;
	abstract getLastRenderData(): Position | null;
	abstract writeScreenReaderContent(reason: string): codemavi;
}
