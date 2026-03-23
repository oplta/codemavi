/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { IMouseWheelEvent } from '../../../../../base/browser/mouseEvent.js';
import { IListContextMenuEvent, IListEvent, IListMouseEvent } from '../../../../../base/browser/ui/list/list.js';
import { IListStyles } from '../../../../../base/browser/ui/list/listWidget.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ScrollEvent } from '../../../../../base/common/scrollable.js';
import { ICodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchListOptionsUpdate } from '../../../../../platform/list/browser/listService.js';
import { CellRevealRangeType, CellRevealType, ICellOutputViewModel, ICellViewModel, INotebookCellOverlayChangeAccessor, INotebookViewZoneChangeAccessor } from '../notebookBrowser.js';
import { CellPartsCollection } from './cellPart.js';
import { CellViewModel, NotebookViewModel } from '../viewModel/notebookViewModelImpl.js';
import { ICellRange } from '../../common/notebookRange.js';


export interface INotebookCellList extends ICoordinatesConverter {
	isDisposed: boolean;
	inRenderingTransaction: boolean;
	viewModel: NotebookViewModel | null;
	webviewElement: FastDomNode<HTMLElement> | null;
	readonly contextKeyService: IContextKeyService;
	element(index: number): ICellViewModel | undefined;
	elementAt(position: number): ICellViewModel | undefined;
	elementHeight(element: ICellViewModel): number;
	onWillScroll: Event<ScrollEvent>;
	onDidScroll: Event<ScrollEvent>;
	onDidChangeFocus: Event<IListEvent<ICellViewModel>>;
	onDidChangeContentHeight: Event<number>;
	onDidChangeVisibleRanges: Event<codemavi>;
	visibleRanges: ICellRange[];
	scrollTop: number;
	scrollHeight: number;
	scrollLeft: number;
	length: number;
	rowsContainer: HTMLElement;
	scrollableElement: HTMLElement;
	ariaLabel: string;
	readonly onDidRemoveOutputs: Event<readonly ICellOutputViewModel[]>;
	readonly onDidHideOutputs: Event<readonly ICellOutputViewModel[]>;
	readonly onDidRemoveCellsFromView: Event<readonly ICellViewModel[]>;
	readonly onMouseUp: Event<IListMouseEvent<CellViewModel>>;
	readonly onMouseDown: Event<IListMouseEvent<CellViewModel>>;
	readonly onContextMenu: Event<IListContextMenuEvent<CellViewModel>>;
	detachViewModel(): codemavi;
	attachViewModel(viewModel: NotebookViewModel): codemavi;
	attachWebview(element: HTMLElement): codemavi;
	clear(): codemavi;
	focusElement(element: ICellViewModel): codemavi;
	selectElements(elements: ICellViewModel[]): codemavi;
	getFocusedElements(): ICellViewModel[];
	getSelectedElements(): ICellViewModel[];
	scrollToBottom(): codemavi;
	revealCell(cell: ICellViewModel, revealType: CellRevealType): Promise<codemavi>;
	revealCells(range: ICellRange): codemavi;
	revealRangeInCell(cell: ICellViewModel, range: Selection | Range, revealType: CellRevealRangeType): Promise<codemavi>;
	revealCellOffsetInCenter(element: ICellViewModel, offset: number): codemavi;
	revealOffsetInCenterIfOutsideViewport(offset: number): codemavi;
	setHiddenAreas(_ranges: ICellRange[], triggerViewUpdate: boolean): boolean;
	changeViewZones(callback: (accessor: INotebookViewZoneChangeAccessor) => codemavi): codemavi;
	changeCellOverlays(callback: (accessor: INotebookCellOverlayChangeAccessor) => codemavi): codemavi;
	getViewZoneLayoutInfo(viewZoneId: string): { height: number; top: number } | null;
	domElementOfElement(element: ICellViewModel): HTMLElement | null;
	focusView(): codemavi;
	triggerScrollFromMouseWheelEvent(browserEvent: IMouseWheelEvent): codemavi;
	updateElementHeight2(element: ICellViewModel, size: number, anchorElementIndex?: number | null): codemavi;
	domFocus(): codemavi;
	focusContainer(clearSelection: boolean): codemavi;
	setCellEditorSelection(element: ICellViewModel, range: Range): codemavi;
	style(styles: IListStyles): codemavi;
	getRenderHeight(): number;
	getScrollHeight(): number;
	updateOptions(options: IWorkbenchListOptionsUpdate): codemavi;
	layout(height?: number, width?: number): codemavi;
	dispose(): codemavi;
}

export interface BaseCellRenderTemplate {
	readonly rootContainer: HTMLElement;
	readonly editorPart: HTMLElement;
	readonly cellInputCollapsedContainer: HTMLElement;
	readonly instantiationService: IInstantiationService;
	readonly container: HTMLElement;
	readonly cellContainer: HTMLElement;
	readonly templateDisposables: DisposableStore;
	readonly elementDisposables: DisposableStore;
	currentRenderedCell?: ICellViewModel;
	cellParts: CellPartsCollection;
	toJSON: () => object;
}

export interface MarkdownCellRenderTemplate extends BaseCellRenderTemplate {
	readonly editorContainer: HTMLElement;
	readonly foldingIndicator: HTMLElement;
	currentEditor?: ICodeEditor;
}

export interface CodeCellRenderTemplate extends BaseCellRenderTemplate {
	outputContainer: FastDomNode<HTMLElement>;
	cellOutputCollapsedContainer: HTMLElement;
	outputShowMoreContainer: FastDomNode<HTMLElement>;
	focusSinkElement: HTMLElement;
	editor: ICodeEditor;
}

export interface ICoordinatesConverter {
	getCellViewScrollTop(cell: ICellViewModel): number;
	getCellViewScrollBottom(cell: ICellViewModel): number;
	getViewIndex(cell: ICellViewModel): number | undefined;
	getViewIndex2(modelIndex: number): number | undefined;
	getModelIndex(cell: CellViewModel): number | undefined;
	getModelIndex2(viewIndex: number): number | undefined;
	getVisibleRangesPlusViewportAboveAndBelow(): ICellRange[];
	modelIndexIsVisible(modelIndex: number): boolean;
	convertModelIndexToViewIndex(modelIndex: number): number;
}
