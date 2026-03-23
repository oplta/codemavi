/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare function setTimeout(callback: (...args: any[]) => codemavi, ms: number, ...args: any[]): NodeJS.Timer;
declare function clearTimeout(timeoutId: NodeJS.Timer): codemavi;
declare function setInterval(callback: (...args: any[]) => codemavi, ms: number, ...args: any[]): NodeJS.Timer;
declare function clearInterval(intervalId: NodeJS.Timer): codemavi;
declare function setImmediate(callback: (...args: any[]) => codemavi, ...args: any[]): any;
declare function clearImmediate(immediateId: any): codemavi;
