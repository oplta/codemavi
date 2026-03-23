/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AutorunObserver } from '../autorun.js';
import { IObservable, TransactionImpl } from '../base.js';
import type { Derived } from '../derived.js';

let globalObservableLogger: IObservableLogger | undefined;

export function addLogger(logger: IObservableLogger): codemavi {
	if (!globalObservableLogger) {
		globalObservableLogger = logger;
	} else if (globalObservableLogger instanceof ComposedLogger) {
		globalObservableLogger.loggers.push(logger);
	} else {
		globalObservableLogger = new ComposedLogger([globalObservableLogger, logger]);
	}
}

export function getLogger(): IObservableLogger | undefined {
	return globalObservableLogger;
}

let globalObservableLoggerFn: ((obs: IObservable<any>) => codemavi) | undefined = undefined;
export function setLogObservableFn(fn: (obs: IObservable<any>) => codemavi): codemavi {
	globalObservableLoggerFn = fn;
}

export function logObservable(obs: IObservable<any>): codemavi {
	if (globalObservableLoggerFn) {
		globalObservableLoggerFn(obs);
	}
}

export interface IChangeInformation {
	oldValue: unknown;
	newValue: unknown;
	change: unknown;
	didChange: boolean;
	hadValue: boolean;
}

export interface IObservableLogger {
	handleObservableCreated(observable: IObservable<any>): codemavi;
	handleOnListenerCountChanged(observable: IObservable<any>, newCount: number): codemavi;

	handleObservableUpdated(observable: IObservable<any>, info: IChangeInformation): codemavi;

	handleAutorunCreated(autorun: AutorunObserver): codemavi;
	handleAutorunDisposed(autorun: AutorunObserver): codemavi;
	handleAutorunDependencyChanged(autorun: AutorunObserver, observable: IObservable<any>, change: unknown): codemavi;
	handleAutorunStarted(autorun: AutorunObserver): codemavi;
	handleAutorunFinished(autorun: AutorunObserver): codemavi;

	handleDerivedDependencyChanged(derived: Derived<any>, observable: IObservable<any>, change: unknown): codemavi;
	handleDerivedCleared(observable: Derived<any>): codemavi;

	handleBeginTransaction(transaction: TransactionImpl): codemavi;
	handleEndTransaction(transaction: TransactionImpl): codemavi;
}

class ComposedLogger implements IObservableLogger {
	constructor(
		public readonly loggers: IObservableLogger[],
	) { }

	handleObservableCreated(observable: IObservable<any>): codemavi {
		for (const logger of this.loggers) {
			logger.handleObservableCreated(observable);
		}
	}
	handleOnListenerCountChanged(observable: IObservable<any>, newCount: number): codemavi {
		for (const logger of this.loggers) {
			logger.handleOnListenerCountChanged(observable, newCount);
		}
	}
	handleObservableUpdated(observable: IObservable<any>, info: IChangeInformation): codemavi {
		for (const logger of this.loggers) {
			logger.handleObservableUpdated(observable, info);
		}
	}
	handleAutorunCreated(autorun: AutorunObserver): codemavi {
		for (const logger of this.loggers) {
			logger.handleAutorunCreated(autorun);
		}
	}
	handleAutorunDisposed(autorun: AutorunObserver): codemavi {
		for (const logger of this.loggers) {
			logger.handleAutorunDisposed(autorun);
		}
	}
	handleAutorunDependencyChanged(autorun: AutorunObserver, observable: IObservable<any>, change: unknown): codemavi {
		for (const logger of this.loggers) {
			logger.handleAutorunDependencyChanged(autorun, observable, change);
		}
	}
	handleAutorunStarted(autorun: AutorunObserver): codemavi {
		for (const logger of this.loggers) {
			logger.handleAutorunStarted(autorun);
		}
	}
	handleAutorunFinished(autorun: AutorunObserver): codemavi {
		for (const logger of this.loggers) {
			logger.handleAutorunFinished(autorun);
		}
	}
	handleDerivedDependencyChanged(derived: Derived<any>, observable: IObservable<any>, change: unknown): codemavi {
		for (const logger of this.loggers) {
			logger.handleDerivedDependencyChanged(derived, observable, change);
		}
	}
	handleDerivedCleared(observable: Derived<any>): codemavi {
		for (const logger of this.loggers) {
			logger.handleDerivedCleared(observable);
		}
	}
	handleBeginTransaction(transaction: TransactionImpl): codemavi {
		for (const logger of this.loggers) {
			logger.handleBeginTransaction(transaction);
		}
	}
	handleEndTransaction(transaction: TransactionImpl): codemavi {
		for (const logger of this.loggers) {
			logger.handleEndTransaction(transaction);
		}
	}
}
