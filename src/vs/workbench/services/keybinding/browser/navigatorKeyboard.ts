/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IKeyboard {
	getLayoutMap(): Promise<Object>;
	lock(keyCodes?: string[]): Promise<codemavi>;
	unlock(): codemavi;
	addEventListener?(type: string, listener: () => codemavi): codemavi;

}
export type INavigatorWithKeyboard = Navigator & {
	keyboard: IKeyboard;
};