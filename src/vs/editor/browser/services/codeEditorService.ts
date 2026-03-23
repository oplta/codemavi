/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../base/common/event.js';
import { ICodeEditor, IDiffEditor } from '../editorBrowser.js';
import { IDecorationRenderOptions } from '../../common/editorCommon.js';
import { IModelDecorationOptions, ITextModel } from '../../common/model.js';
import { ITextResourceEditorInput } from '../../../platform/editor/common/editor.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../base/common/uri.js';
import { IDisposable } from '../../../base/common/lifecycle.js';

export const ICodeEditorService = createDecorator<ICodeEditorService>('codeEditorService');

export interface ICodeEditorService {
	readonly _serviceBrand: undefined;

	readonly onWillCreateCodeEditor: Event<codemavi>;
	readonly onCodeEditorAdd: Event<ICodeEditor>;
	readonly onCodeEditorRemove: Event<ICodeEditor>;

	readonly onWillCreateDiffEditor: Event<codemavi>;
	readonly onDiffEditorAdd: Event<IDiffEditor>;
	readonly onDiffEditorRemove: Event<IDiffEditor>;

	readonly onDidChangeTransientModelProperty: Event<ITextModel>;
	readonly onDecorationTypeRegistered: Event<string>;

	willCreateCodeEditor(): codemavi;
	addCodeEditor(editor: ICodeEditor): codemavi;
	removeCodeEditor(editor: ICodeEditor): codemavi;
	listCodeEditors(): readonly ICodeEditor[];

	willCreateDiffEditor(): codemavi;
	addDiffEditor(editor: IDiffEditor): codemavi;
	removeDiffEditor(editor: IDiffEditor): codemavi;
	listDiffEditors(): readonly IDiffEditor[];

	/**
	 * Returns the current focused code editor (if the focus is in the editor or in an editor widget) or null.
	 */
	getFocusedCodeEditor(): ICodeEditor | null;

	registerDecorationType(description: string, key: string, options: IDecorationRenderOptions, parentTypeKey?: string, editor?: ICodeEditor): codemavi;
	listDecorationTypes(): string[];
	removeDecorationType(key: string): codemavi;
	resolveDecorationOptions(typeKey: string, writable: boolean): IModelDecorationOptions;
	resolveDecorationCSSRules(decorationTypeKey: string): CSSRuleList | null;

	setModelProperty(resource: URI, key: string, value: any): codemavi;
	getModelProperty(resource: URI, key: string): any;

	setTransientModelProperty(model: ITextModel, key: string, value: any): codemavi;
	getTransientModelProperty(model: ITextModel, key: string): any;
	getTransientModelProperties(model: ITextModel): [string, any][] | undefined;

	getActiveCodeEditor(): ICodeEditor | null;
	openCodeEditor(input: ITextResourceEditorInput, source: ICodeEditor | null, sideBySide?: boolean): Promise<ICodeEditor | null>;
	registerCodeEditorOpenHandler(handler: ICodeEditorOpenHandler): IDisposable;
}

export interface ICodeEditorOpenHandler {
	(input: ITextResourceEditorInput, source: ICodeEditor | null, sideBySide?: boolean): Promise<ICodeEditor | null>;
}
