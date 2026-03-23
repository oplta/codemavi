/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CodeWindow } from '../../../../base/browser/window.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorContributionDescription } from '../../../../editor/browser/editorExtensions.js';
import * as editorCommon from '../../../../editor/common/editorCommon.js';
import { FontInfo } from '../../../../editor/common/config/fontInfo.js';
import { IPosition } from '../../../../editor/common/core/position.js';
import { IRange, Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { FindMatch, IModelDeltaDecoration, IReadonlyTextBuffer, ITextModel, TrackedRangeStickiness } from '../../../../editor/common/model.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ITextEditorOptions, ITextResourceEditorInput } from '../../../../platform/editor/common/editor.js';
import { IConstructorSignature } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorPane, IEditorPaneWithSelection } from '../../../common/editor.js';
import { CellViewModelStateChangeEvent, NotebookCellStateChangedEvent, NotebookLayoutInfo } from './notebookViewEvents.js';
import { NotebookCellTextModel } from '../common/model/notebookCellTextModel.js';
import { NotebookTextModel } from '../common/model/notebookTextModel.js';
import { CellKind, ICellOutput, INotebookCellStatusBarItem, INotebookRendererInfo, INotebookFindOptions, IOrderedMimeType, NotebookCellInternalMetadata, NotebookCellMetadata, NOTEBOOK_EDITOR_ID } from '../common/notebookCommon.js';
import { isCompositeNotebookEditorInput } from '../common/notebookEditorInput.js';
import { INotebookKernel } from '../common/notebookKernelService.js';
import { NotebookOptions } from './notebookOptions.js';
import { cellRangesToIndexes, ICellRange, reduceCellRanges } from '../common/notebookRange.js';
import { IWebviewElement } from '../../webview/browser/webview.js';
import { IEditorCommentsOptions, IEditorOptions } from '../../../../editor/common/config/editorOptions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IObservable } from '../../../../base/common/observable.js';
import { NotebookTextDiffEditor } from './diff/notebookDiffEditor.js';
import { INotebookTextDiffEditor } from './diff/notebookDiffEditorBrowser.js';

//#region Shared commands
export const EXPAND_CELL_INPUT_COMMAND_ID = 'notebook.cell.expandCellInput';
export const EXECUTE_CELL_COMMAND_ID = 'notebook.cell.execute';
export const DETECT_CELL_LANGUAGE = 'notebook.cell.detectLanguage';
export const CHANGE_CELL_LANGUAGE = 'notebook.cell.changeLanguage';
export const QUIT_EDIT_CELL_COMMAND_ID = 'notebook.cell.quitEdit';
export const EXPAND_CELL_OUTPUT_COMMAND_ID = 'notebook.cell.expandCellOutput';


//#endregion

//#region Notebook extensions

// Hardcoding viewType/extension ID for now. TODO these should be replaced once we can
// look them up in the marketplace dynamically.
export const IPYNB_VIEW_TYPE = 'jupyter-notebook';
export const JUPYTER_EXTENSION_ID = 'ms-toolsai.jupyter';
/** @deprecated use the notebookKernel<Type> "keyword" instead */
export const KERNEL_EXTENSIONS = new Map<string, string>([
	[IPYNB_VIEW_TYPE, JUPYTER_EXTENSION_ID],
]);
// @TODO lramos15, place this in a similar spot to our normal recommendations.
export const KERNEL_RECOMMENDATIONS = new Map<string, Map<string, INotebookExtensionRecommendation>>();
KERNEL_RECOMMENDATIONS.set(IPYNB_VIEW_TYPE, new Map<string, INotebookExtensionRecommendation>());
KERNEL_RECOMMENDATIONS.get(IPYNB_VIEW_TYPE)?.set('python', {
	extensionIds: [
		'ms-python.python',
		JUPYTER_EXTENSION_ID
	],
	displayName: 'Python + Jupyter',
});

export interface INotebookExtensionRecommendation {
	readonly extensionIds: string[];
	readonly displayName?: string;
}

//#endregion

//#region  Output related types

// !! IMPORTANT !! ----------------------------------------------------------------------------------
// NOTE that you MUST update vs/workbench/contrib/notebook/browser/view/renderers/webviewPreloads.ts#L1986
// whenever changing the values of this const enum. The webviewPreloads-files manually inlines these values
// because it cannot have dependencies.
// !! IMPORTANT !! ----------------------------------------------------------------------------------
export const enum RenderOutputType {
	Html = 0,
	Extension = 1
}

export interface IRenderPlainHtmlOutput {
	readonly type: RenderOutputType.Html;
	readonly source: IDisplayOutputViewModel;
	readonly htmlContent: string;
}

export interface IRenderOutputViaExtension {
	readonly type: RenderOutputType.Extension;
	readonly source: IDisplayOutputViewModel;
	readonly mimeType: string;
	readonly renderer: INotebookRendererInfo;
}

export type IInsetRenderOutput = IRenderPlainHtmlOutput | IRenderOutputViaExtension;

export interface ICellOutputViewModel extends IDisposable {
	cellViewModel: IGenericCellViewModel;
	/**
	 * When rendering an output, `model` should always be used as we convert legacy `text/error` output to `display_data` output under the hood.
	 */
	model: ICellOutput;
	resolveMimeTypes(textModel: NotebookTextModel, kernelProvides: readonly string[] | undefined): [readonly IOrderedMimeType[], number];
	pickedMimeType: IOrderedMimeType | undefined;
	hasMultiMimeType(): boolean;
	readonly onDidResetRenderer: Event<codemavi>;
	readonly visible: IObservable<boolean>;
	setVisible(visible: boolean, force?: boolean): codemavi;
	resetRenderer(): codemavi;
	toRawJSON(): any;
}

export interface IDisplayOutputViewModel extends ICellOutputViewModel {
	resolveMimeTypes(textModel: NotebookTextModel, kernelProvides: readonly string[] | undefined): [readonly IOrderedMimeType[], number];
}


//#endregion

//#region Shared types between the Notebook Editor and Notebook Diff Editor, they are mostly used for output rendering

export interface IGenericCellViewModel {
	id: string;
	handle: number;
	uri: URI;
	metadata: NotebookCellMetadata;
	outputIsHovered: boolean;
	outputIsFocused: boolean;
	inputInOutputIsFocused: boolean;
	outputsViewModels: ICellOutputViewModel[];
	getOutputOffset(index: number): number;
	updateOutputHeight(index: number, height: number, source?: string): codemavi;
}

export interface IDisplayOutputLayoutUpdateRequest {
	readonly cell: IGenericCellViewModel;
	output: IDisplayOutputViewModel;
	cellTop: number;
	outputOffset: number;
	forceDisplay: boolean;
}

export interface ICommonCellInfo {
	readonly cellId: string;
	readonly cellHandle: number;
	readonly cellUri: URI;
	readonly executionId?: string;
}

export enum ScrollToRevealBehavior {
	fullCell,
	firstLine
}

export interface IFocusNotebookCellOptions {
	readonly skipReveal?: boolean;
	readonly focusEditorLine?: number;
	readonly revealBehavior?: ScrollToRevealBehavior | undefined;
	readonly outputId?: string;
	readonly altOutputId?: string;
	readonly outputWebviewFocused?: boolean;
}

//#endregion

export enum CellLayoutState {
	Uninitialized,
	Estimated,
	FromCache,
	Measured
}

/** LayoutInfo of the parts that are shared between all cell types. */
export interface CellLayoutInfo {
	readonly layoutState: CellLayoutState;
	readonly fontInfo: FontInfo | null;
	readonly chatHeight: number;
	readonly editorWidth: number;
	readonly editorHeight: number;
	readonly statusBarHeight: number;
	readonly commentOffset: number;
	readonly commentHeight: number;
	readonly bottomToolbarOffset: number;
	readonly totalHeight: number;
}

export interface CellLayoutChangeEvent {
	readonly font?: FontInfo;
	readonly outerWidth?: number;
	readonly commentHeight?: boolean;
}

export interface CodeCellLayoutInfo extends CellLayoutInfo {
	readonly estimatedHasHorizontalScrolling: boolean;
	readonly outputContainerOffset: number;
	readonly outputTotalHeight: number;
	readonly outputShowMoreContainerHeight: number;
	readonly outputShowMoreContainerOffset: number;
	readonly codeIndicatorHeight: number;
	readonly outputIndicatorHeight: number;
}

export interface CodeCellLayoutChangeEvent extends CellLayoutChangeEvent {
	readonly source?: string;
	readonly chatHeight?: boolean;
	readonly editorHeight?: boolean;
	readonly outputHeight?: boolean;
	readonly outputShowMoreContainerHeight?: number;
	readonly totalHeight?: boolean;
}

export interface MarkupCellLayoutInfo extends CellLayoutInfo {
	readonly previewHeight: number;
	readonly foldHintHeight: number;
}

export enum CellLayoutContext {
	Fold
}

export interface MarkupCellLayoutChangeEvent extends CellLayoutChangeEvent {
	readonly editorHeight?: number;
	readonly previewHeight?: number;
	totalHeight?: number;
	readonly context?: CellLayoutContext;
}

export interface ICommonCellViewModelLayoutChangeInfo {
	readonly totalHeight?: boolean | number;
	readonly outerWidth?: number;
	readonly context?: CellLayoutContext;
}
export interface ICellViewModel extends IGenericCellViewModel {
	readonly model: NotebookCellTextModel;
	readonly id: string;
	readonly textBuffer: IReadonlyTextBuffer;
	readonly layoutInfo: CellLayoutInfo;
	readonly onDidChangeLayout: Event<ICommonCellViewModelLayoutChangeInfo>;
	readonly onDidChangeCellStatusBarItems: Event<codemavi>;
	readonly onCellDecorationsChanged: Event<{ added: INotebookCellDecorationOptions[]; removed: INotebookCellDecorationOptions[] }>;
	readonly onDidChangeState: Event<CellViewModelStateChangeEvent>;
	readonly onDidChangeEditorAttachState: Event<codemavi>;
	readonly editStateSource: string;
	readonly editorAttached: boolean;
	isInputCollapsed: boolean;
	isOutputCollapsed: boolean;
	dragging: boolean;
	handle: number;
	uri: URI;
	language: string;
	readonly mime: string;
	cellKind: CellKind;
	lineNumbers: 'on' | 'off' | 'inherit';
	commentOptions: IEditorCommentsOptions;
	chatHeight: number;
	commentHeight: number;
	focusMode: CellFocusMode;
	focusedOutputId?: string | undefined;
	outputIsHovered: boolean;
	getText(): string;
	getAlternativeId(): number;
	getTextLength(): number;
	getHeight(lineHeight: number): number;
	metadata: NotebookCellMetadata;
	internalMetadata: NotebookCellInternalMetadata;
	textModel: ITextModel | undefined;
	hasModel(): this is IEditableCellViewModel;
	resolveTextModel(): Promise<ITextModel>;
	getSelections(): Selection[];
	setSelections(selections: Selection[]): codemavi;
	getSelectionsStartPosition(): IPosition[] | undefined;
	getCellDecorations(): INotebookCellDecorationOptions[];
	getCellStatusBarItems(): INotebookCellStatusBarItem[];
	getEditState(): CellEditState;
	updateEditState(state: CellEditState, source: string): codemavi;
	deltaModelDecorations(oldDecorations: readonly string[], newDecorations: readonly IModelDeltaDecoration[]): string[];
	getCellDecorationRange(id: string): Range | null;
	enableAutoLanguageDetection(): codemavi;
}

export interface IEditableCellViewModel extends ICellViewModel {
	textModel: ITextModel;
}

export interface INotebookEditorMouseEvent {
	readonly event: MouseEvent;
	readonly target: ICellViewModel;
}

export interface INotebookEditorContribution {
	/**
	 * Dispose this contribution.
	 */
	dispose(): codemavi;
	/**
	 * Store view state.
	 */
	saveViewState?(): unknown;
	/**
	 * Restore view state.
	 */
	restoreViewState?(state: unknown): codemavi;
}

/**
 * Vertical Lane in the overview ruler of the notebook editor.
 */
export enum NotebookOverviewRulerLane {
	Left = 1,
	Center = 2,
	Right = 4,
	Full = 7
}

export interface INotebookCellDecorationOptions {
	className?: string;
	gutterClassName?: string;
	outputClassName?: string;
	topClassName?: string;
	overviewRuler?: {
		color: string;
		modelRanges: IRange[];
		includeOutput: boolean;
		position: NotebookOverviewRulerLane;
	};
}

export interface INotebookViewZoneDecorationOptions {
	overviewRuler?: {
		color: string;
		position: NotebookOverviewRulerLane;
	};
}

export interface INotebookDeltaCellDecoration {
	readonly handle: number;
	readonly options: INotebookCellDecorationOptions;
}

export interface INotebookDeltaViewZoneDecoration {
	readonly viewZoneId: string;
	readonly options: INotebookViewZoneDecorationOptions;
}

export function isNotebookCellDecoration(obj: unknown): obj is INotebookDeltaCellDecoration {
	return !!obj && typeof (obj as INotebookDeltaCellDecoration).handle === 'number';
}

export function isNotebookViewZoneDecoration(obj: unknown): obj is INotebookDeltaViewZoneDecoration {
	return !!obj && typeof (obj as INotebookDeltaViewZoneDecoration).viewZoneId === 'string';
}

export type INotebookDeltaDecoration = INotebookDeltaCellDecoration | INotebookDeltaViewZoneDecoration;

export interface INotebookDeltaCellStatusBarItems {
	readonly handle: number;
	readonly items: readonly INotebookCellStatusBarItem[];
}

export const enum CellRevealType {
	Default = 1,
	Top = 2,
	Center = 3,
	CenterIfOutsideViewport = 4,
	NearTopIfOutsideViewport = 5,
	FirstLineIfOutsideViewport = 6
}

export enum CellRevealRangeType {
	Default = 1,
	Center = 2,
	CenterIfOutsideViewport = 3,
}

export interface INotebookEditorOptions extends ITextEditorOptions {
	readonly cellOptions?: ITextResourceEditorInput;
	readonly cellRevealType?: CellRevealType;
	readonly cellSelections?: ICellRange[];
	readonly isReadOnly?: boolean;
	readonly viewState?: INotebookEditorViewState;
	readonly indexedCellOptions?: { index: number; selection?: IRange };
	readonly label?: string;
}

export type INotebookEditorContributionCtor = IConstructorSignature<INotebookEditorContribution, [INotebookEditor]>;

export interface INotebookEditorContributionDescription {
	id: string;
	ctor: INotebookEditorContributionCtor;
}

export interface INotebookEditorCreationOptions {
	readonly isReplHistory?: boolean;
	readonly isReadOnly?: boolean;
	readonly contributions?: INotebookEditorContributionDescription[];
	readonly cellEditorContributions?: IEditorContributionDescription[];
	readonly menuIds: {
		notebookToolbar: MenuId;
		cellTitleToolbar: MenuId;
		cellDeleteToolbar: MenuId;
		cellInsertToolbar: MenuId;
		cellTopInsertToolbar: MenuId;
		cellExecuteToolbar: MenuId;
		cellExecutePrimary?: MenuId;
	};
	readonly options?: NotebookOptions;
	readonly codeWindow?: CodeWindow;
}

export interface INotebookWebviewMessage {
	readonly message: unknown;
}

//#region Notebook View Model
export interface INotebookEditorViewState {
	editingCells: { [key: number]: boolean };
	collapsedInputCells: { [key: number]: boolean };
	collapsedOutputCells: { [key: number]: boolean };
	cellLineNumberStates: { [key: number]: 'on' | 'off' };
	editorViewStates: { [key: number]: editorCommon.ICodeEditorViewState | null };
	hiddenFoldingRanges?: ICellRange[];
	cellTotalHeights?: { [key: number]: number };
	scrollPosition?: { left: number; top: number };
	focus?: number;
	editorFocused?: boolean;
	contributionsState?: { [id: string]: unknown };
	selectedKernelId?: string;
}

export interface ICellModelDecorations {
	readonly ownerId: number;
	readonly decorations: readonly string[];
}

export interface ICellModelDeltaDecorations {
	readonly ownerId: number;
	readonly decorations: readonly IModelDeltaDecoration[];
}

export interface IModelDecorationsChangeAccessor {
	deltaDecorations(oldDecorations: ICellModelDecorations[], newDecorations: ICellModelDeltaDecorations[]): ICellModelDecorations[];
}

export interface INotebookViewZone {
	/**
	 * Use 0 to place a view zone before the first cell
	 */
	afterModelPosition: number;
	domNode: HTMLElement;

	heightInPx: number;
}

export interface INotebookViewZoneChangeAccessor {
	addZone(zone: INotebookViewZone): string;
	removeZone(id: string): codemavi;
	layoutZone(id: string): codemavi;
}

export interface INotebookCellOverlay {
	cell: ICellViewModel;
	domNode: HTMLElement;
}

export interface INotebookCellOverlayChangeAccessor {
	addOverlay(overlay: INotebookCellOverlay): string;
	removeOverlay(id: string): codemavi;
	layoutOverlay(id: string): codemavi;
}

export type NotebookViewCellsSplice = [
	number /* start */,
	number /* delete count */,
	ICellViewModel[]
];

export interface INotebookViewCellsUpdateEvent {
	readonly synchronous: boolean;
	readonly splices: readonly NotebookViewCellsSplice[];
}

export interface INotebookViewModel {
	notebookDocument: NotebookTextModel;
	readonly viewCells: ICellViewModel[];
	layoutInfo: NotebookLayoutInfo | null;
	viewType: string;
	onDidChangeViewCells: Event<INotebookViewCellsUpdateEvent>;
	onDidChangeSelection: Event<string>;
	onDidFoldingStateChanged: Event<codemavi>;
	getNearestVisibleCellIndexUpwards(index: number): number;
	getTrackedRange(id: string): ICellRange | null;
	setTrackedRange(id: string | null, newRange: ICellRange | null, newStickiness: TrackedRangeStickiness): string | null;
	getOverviewRulerDecorations(): INotebookDeltaViewZoneDecoration[];
	getSelections(): ICellRange[];
	getCellIndex(cell: ICellViewModel): number;
	getMostRecentlyExecutedCell(): ICellViewModel | undefined;
	deltaCellStatusBarItems(oldItems: string[], newItems: INotebookDeltaCellStatusBarItems[]): string[];
	getFoldedLength(index: number): number;
	getFoldingStartIndex(index: number): number;
	replaceOne(cell: ICellViewModel, range: Range, text: string): Promise<codemavi>;
	replaceAll(matches: CellFindMatchWithIndex[], texts: string[]): Promise<codemavi>;
}
//#endregion

export interface INotebookEditor {
	//#region Eventing
	readonly onDidChangeCellState: Event<NotebookCellStateChangedEvent>;
	readonly onDidChangeViewCells: Event<INotebookViewCellsUpdateEvent>;
	readonly onDidChangeVisibleRanges: Event<codemavi>;
	readonly onDidChangeSelection: Event<codemavi>;
	readonly onDidChangeFocus: Event<codemavi>;
	/**
	 * An event emitted when the model of this editor has changed.
	 */
	readonly onDidChangeModel: Event<NotebookTextModel | undefined>;
	readonly onDidAttachViewModel: Event<codemavi>;
	readonly onDidFocusWidget: Event<codemavi>;
	readonly onDidBlurWidget: Event<codemavi>;
	readonly onDidScroll: Event<codemavi>;
	readonly onDidChangeLayout: Event<codemavi>;
	readonly onDidChangeActiveCell: Event<codemavi>;
	readonly onDidChangeActiveEditor: Event<INotebookEditor>;
	readonly onDidChangeActiveKernel: Event<codemavi>;
	readonly onMouseUp: Event<INotebookEditorMouseEvent>;
	readonly onMouseDown: Event<INotebookEditorMouseEvent>;
	//#endregion

	//#region readonly properties
	readonly visibleRanges: ICellRange[];
	readonly textModel?: NotebookTextModel;
	readonly isVisible: boolean;
	readonly isReadOnly: boolean;
	readonly notebookOptions: NotebookOptions;
	readonly isDisposed: boolean;
	readonly activeKernel: INotebookKernel | undefined;
	readonly scrollTop: number;
	readonly scrollBottom: number;
	readonly scopedContextKeyService: IContextKeyService;
	/**
	 * Required for Composite Editor check. The interface should not be changed.
	 */
	readonly activeCodeEditor: ICodeEditor | undefined;
	readonly codeEditors: [ICellViewModel, ICodeEditor][];
	readonly activeCellAndCodeEditor: [ICellViewModel, ICodeEditor] | undefined;
	//#endregion

	getLength(): number;
	getSelections(): ICellRange[];
	setSelections(selections: ICellRange[]): codemavi;
	getFocus(): ICellRange;
	setFocus(focus: ICellRange): codemavi;
	getId(): string;

	getViewModel(): INotebookViewModel | undefined;
	hasModel(): this is IActiveNotebookEditor;
	dispose(): codemavi;
	getDomNode(): HTMLElement;
	getInnerWebview(): IWebviewElement | undefined;
	getSelectionViewModels(): ICellViewModel[];
	getEditorViewState(): INotebookEditorViewState;
	restoreListViewState(viewState: INotebookEditorViewState | undefined): codemavi;

	getBaseCellEditorOptions(language: string): IBaseCellEditorOptions;

	/**
	 * Focus the active cell in notebook cell list
	 */
	focus(): codemavi;

	/**
	 * Focus the notebook cell list container
	 */
	focusContainer(clearSelection?: boolean): codemavi;

	hasEditorFocus(): boolean;
	hasWebviewFocus(): boolean;

	hasOutputTextSelection(): boolean;
	setOptions(options: INotebookEditorOptions | undefined): Promise<codemavi>;

	/**
	 * Select & focus cell
	 */
	focusElement(cell: ICellViewModel): codemavi;

	/**
	 * Layout info for the notebook editor
	 */
	getLayoutInfo(): NotebookLayoutInfo;

	getVisibleRangesPlusViewportAboveAndBelow(): ICellRange[];

	/**
	 * Focus the container of a cell (the monaco editor inside is not focused).
	 */
	focusNotebookCell(cell: ICellViewModel, focus: 'editor' | 'container' | 'output', options?: IFocusNotebookCellOptions): Promise<codemavi>;

	/**
	 * Execute the given notebook cells
	 */
	executeNotebookCells(cells?: Iterable<ICellViewModel>): Promise<codemavi>;

	/**
	 * Cancel the given notebook cells
	 */
	cancelNotebookCells(cells?: Iterable<ICellViewModel>): Promise<codemavi>;

	/**
	 * Get current active cell
	 */
	getActiveCell(): ICellViewModel | undefined;

	/**
	 * Layout the cell with a new height
	 */
	layoutNotebookCell(cell: ICellViewModel, height: number): Promise<codemavi>;

	/**
	 * Render the output in webview layer
	 */
	createOutput(cell: ICellViewModel, output: IInsetRenderOutput, offset: number, createWhenIdle: boolean): Promise<codemavi>;

	/**
	 * Update the output in webview layer with latest content. It will delegate to `createOutput` is the output is not rendered yet
	 */
	updateOutput(cell: ICellViewModel, output: IInsetRenderOutput, offset: number): Promise<codemavi>;

	/**
	 * Copy the image in the specific cell output to the clipboard
	 */
	copyOutputImage(cellOutput: ICellOutputViewModel): Promise<codemavi>;
	/**
	 * Select the contents of the first focused output of the cell.
	 * Implementation of Ctrl+A for an output item.
	 */
	selectOutputContent(cell: ICellViewModel): codemavi;
	/**
	 * Select the active input element of the first focused output of the cell.
	 * Implementation of Ctrl+A for an input element in an output item.
	 */
	selectInputContents(cell: ICellViewModel): codemavi;

	readonly onDidReceiveMessage: Event<INotebookWebviewMessage>;

	/**
	 * Send message to the webview for outputs.
	 */
	postMessage(message: any): codemavi;

	/**
	 * Remove class name on the notebook editor root DOM node.
	 */
	addClassName(className: string): codemavi;

	/**
	 * Remove class name on the notebook editor root DOM node.
	 */
	removeClassName(className: string): codemavi;

	/**
	 * Set scrollTop value of the notebook editor.
	 */
	setScrollTop(scrollTop: number): codemavi;

	/**
	 * The range will be revealed with as little scrolling as possible.
	 */
	revealCellRangeInView(range: ICellRange): codemavi;

	/**
	 * Reveal cell into viewport.
	 */
	revealInView(cell: ICellViewModel): Promise<codemavi>;

	/**
	 * Reveal cell into the top of viewport.
	 */
	revealInViewAtTop(cell: ICellViewModel): codemavi;

	/**
	 * Reveal cell into viewport center.
	 */
	revealInCenter(cell: ICellViewModel): codemavi;

	/**
	 * Reveal cell into viewport center if cell is currently out of the viewport.
	 */
	revealInCenterIfOutsideViewport(cell: ICellViewModel): Promise<codemavi>;

	/**
	 * Reveal the first line of the cell into the view if the cell is outside of the viewport.
	 */
	revealFirstLineIfOutsideViewport(cell: ICellViewModel): Promise<codemavi>;

	/**
	 * Reveal a line in notebook cell into viewport with minimal scrolling.
	 */
	revealLineInViewAsync(cell: ICellViewModel, line: number): Promise<codemavi>;

	/**
	 * Reveal a line in notebook cell into viewport center.
	 */
	revealLineInCenterAsync(cell: ICellViewModel, line: number): Promise<codemavi>;

	/**
	 * Reveal a line in notebook cell into viewport center.
	 */
	revealLineInCenterIfOutsideViewportAsync(cell: ICellViewModel, line: number): Promise<codemavi>;

	/**
	 * Reveal a range in notebook cell into viewport with minimal scrolling.
	 */
	revealRangeInViewAsync(cell: ICellViewModel, range: Selection | Range): Promise<codemavi>;

	/**
	 * Reveal a range in notebook cell into viewport center.
	 */
	revealRangeInCenterAsync(cell: ICellViewModel, range: Selection | Range): Promise<codemavi>;

	/**
	 * Reveal a range in notebook cell into viewport center.
	 */
	revealRangeInCenterIfOutsideViewportAsync(cell: ICellViewModel, range: Selection | Range): Promise<codemavi>;

	/**
	 * Reveal a position with `offset` in a cell into viewport center.
	 */
	revealCellOffsetInCenter(cell: ICellViewModel, offset: number): codemavi;

	/**
	 * Reveal `offset` in the list view into viewport center if it is outside of the viewport.
	 */
	revealOffsetInCenterIfOutsideViewport(offset: number): codemavi;

	/**
	 * Convert the view range to model range
	 * @param startIndex Inclusive
	 * @param endIndex Exclusive
	 */
	getCellRangeFromViewRange(startIndex: number, endIndex: number): ICellRange | undefined;

	/**
	 * Set hidden areas on cell text models.
	 */
	setHiddenAreas(_ranges: ICellRange[]): boolean;

	/**
	 * Set selectiosn on the text editor attached to the cell
	 */

	setCellEditorSelection(cell: ICellViewModel, selection: Range): codemavi;

	/**
	 *Change the decorations on the notebook cell list
	 */

	deltaCellDecorations(oldDecorations: string[], newDecorations: INotebookDeltaDecoration[]): string[];

	/**
	 * Change the decorations on cell editors.
	 * The notebook is virtualized and this method should be called to create/delete editor decorations safely.
	 */
	changeModelDecorations<T>(callback: (changeAccessor: IModelDecorationsChangeAccessor) => T): T | null;

	changeViewZones(callback: (accessor: INotebookViewZoneChangeAccessor) => codemavi): codemavi;

	changeCellOverlays(callback: (accessor: INotebookCellOverlayChangeAccessor) => codemavi): codemavi;

	getViewZoneLayoutInfo(id: string): { top: number; height: number } | null;

	/**
	 * Get a contribution of this editor.
	 * @id Unique identifier of the contribution.
	 * @return The contribution or null if contribution not found.
	 */
	getContribution<T extends INotebookEditorContribution>(id: string): T;

	/**
	 * Get the view index of a cell at model `index`
	 */
	getViewIndexByModelIndex(index: number): number;
	getCellsInRange(range?: ICellRange): ReadonlyArray<ICellViewModel>;
	cellAt(index: number): ICellViewModel | undefined;
	getCellByHandle(handle: number): ICellViewModel | undefined;
	getCellIndex(cell: ICellViewModel): number | undefined;
	getNextVisibleCellIndex(index: number): number | undefined;
	getPreviousVisibleCellIndex(index: number): number | undefined;
	find(query: string, options: INotebookFindOptions, token: CancellationToken, skipWarmup?: boolean, shouldGetSearchPreviewInfo?: boolean, ownerID?: string): Promise<CellFindMatchWithIndex[]>;
	findHighlightCurrent(matchIndex: number, ownerID?: string): Promise<number>;
	findUnHighlightCurrent(matchIndex: number, ownerID?: string): Promise<codemavi>;
	findStop(ownerID?: string): codemavi;
	showProgress(): codemavi;
	hideProgress(): codemavi;

	getAbsoluteTopOfElement(cell: ICellViewModel): number;
	getHeightOfElement(cell: ICellViewModel): number;
}

export interface IActiveNotebookEditor extends INotebookEditor {
	getViewModel(): INotebookViewModel;
	textModel: NotebookTextModel;
	getFocus(): ICellRange;
	cellAt(index: number): ICellViewModel;
	getCellIndex(cell: ICellViewModel): number;
	getNextVisibleCellIndex(index: number): number;
}

export interface INotebookEditorPane extends IEditorPaneWithSelection {
	getControl(): INotebookEditor | undefined;
	readonly onDidChangeModel: Event<codemavi>;
	textModel: NotebookTextModel | undefined;
}

export interface IBaseCellEditorOptions extends IDisposable {
	readonly value: IEditorOptions;
	readonly onDidChange: Event<codemavi>;
}

/**
 * A mix of public interface and internal one (used by internal rendering code, e.g., cellRenderer)
 */
export interface INotebookEditorDelegate extends INotebookEditor {
	hasModel(): this is IActiveNotebookEditorDelegate;

	readonly creationOptions: INotebookEditorCreationOptions;
	readonly onDidChangeOptions: Event<codemavi>;
	readonly onDidChangeDecorations: Event<codemavi>;
	createMarkupPreview(cell: ICellViewModel): Promise<codemavi>;
	unhideMarkupPreviews(cells: readonly ICellViewModel[]): Promise<codemavi>;
	hideMarkupPreviews(cells: readonly ICellViewModel[]): Promise<codemavi>;

	/**
	 * Remove the output from the webview layer
	 */
	removeInset(output: IDisplayOutputViewModel): codemavi;

	/**
	 * Hide the inset in the webview layer without removing it
	 */
	hideInset(output: IDisplayOutputViewModel): codemavi;
	deltaCellContainerClassNames(cellId: string, added: string[], removed: string[], cellKind: CellKind): codemavi;
}

export interface IActiveNotebookEditorDelegate extends INotebookEditorDelegate {
	getViewModel(): INotebookViewModel;
	textModel: NotebookTextModel;
	getFocus(): ICellRange;
	cellAt(index: number): ICellViewModel;
	getCellIndex(cell: ICellViewModel): number;
	getNextVisibleCellIndex(index: number): number;
}

export interface ISearchPreviewInfo {
	line: string;
	range: {
		start: number;
		end: number;
	};
}

export interface CellWebviewFindMatch {
	readonly index: number;
	readonly searchPreviewInfo?: ISearchPreviewInfo;
}

export type CellContentFindMatch = FindMatch;

export interface CellFindMatch {
	cell: ICellViewModel;
	contentMatches: CellContentFindMatch[];
}

export interface CellFindMatchWithIndex {
	cell: ICellViewModel;
	index: number;
	length: number;
	getMatch(index: number): FindMatch | CellWebviewFindMatch;
	contentMatches: FindMatch[];
	webviewMatches: CellWebviewFindMatch[];
}

export enum CellEditState {
	/**
	 * Default state.
	 * For markup cells, this is the renderer version of the markup.
	 * For code cell, the browser focus should be on the container instead of the editor
	 */
	Preview,

	/**
	 * Editing mode. Source for markup or code is rendered in editors and the state will be persistent.
	 */
	Editing
}

export enum CellFocusMode {
	Container,
	Editor,
	Output,
	ChatInput
}

export enum CursorAtBoundary {
	None,
	Top,
	Bottom,
	Both
}

export enum CursorAtLineBoundary {
	None,
	Start,
	End,
	Both
}

export function getNotebookEditorFromEditorPane(editorPane?: IEditorPane): INotebookEditor | undefined {
	if (!editorPane) {
		return;
	}

	if (editorPane.getId() === NOTEBOOK_EDITOR_ID) {
		return editorPane.getControl() as INotebookEditor | undefined;
	}

	if (editorPane.getId() === NotebookTextDiffEditor.ID) {
		return (editorPane.getControl() as INotebookTextDiffEditor).inlineNotebookEditor;
	}

	const input = editorPane.input;

	const isCompositeNotebook = input && isCompositeNotebookEditorInput(input);

	if (isCompositeNotebook) {
		return (editorPane.getControl() as { notebookEditor: INotebookEditor | undefined } | undefined)?.notebookEditor;
	}

	return undefined;
}

/**
 * ranges: model selections
 * this will convert model selections to view indexes first, and then include the hidden ranges in the list view
 */
export function expandCellRangesWithHiddenCells(editor: INotebookEditor, ranges: ICellRange[]) {
	// assuming ranges are sorted and no overlap
	const indexes = cellRangesToIndexes(ranges);
	const modelRanges: ICellRange[] = [];
	indexes.forEach(index => {
		const viewCell = editor.cellAt(index);

		if (!viewCell) {
			return;
		}

		const viewIndex = editor.getViewIndexByModelIndex(index);
		if (viewIndex < 0) {
			return;
		}

		const nextViewIndex = viewIndex + 1;
		const range = editor.getCellRangeFromViewRange(viewIndex, nextViewIndex);

		if (range) {
			modelRanges.push(range);
		}
	});

	return reduceCellRanges(modelRanges);
}

export function cellRangeToViewCells(editor: IActiveNotebookEditor, ranges: ICellRange[]) {
	const cells: ICellViewModel[] = [];
	reduceCellRanges(ranges).forEach(range => {
		cells.push(...editor.getCellsInRange(range));
	});

	return cells;
}

//#region Cell Folding
export const enum CellFoldingState {
	None,
	Expanded,
	Collapsed
}

export interface EditorFoldingStateDelegate {
	getCellIndex(cell: ICellViewModel): number;
	getFoldingState(index: number): CellFoldingState;
}
//#endregion
