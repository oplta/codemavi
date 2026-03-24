/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useActiveURI, useIsDark, useSettingsState } from '../util/services.js';

import '../styles.css'
import { MAVI_CTRL_K_ACTION_ID, MAVI_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { Circle, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { MaviSelectionHelperProps } from '../../../../../../contrib/mavi/browser/maviSelectionHelperWidget.js';
import { MAVI_OPEN_SETTINGS_ACTION_ID } from '../../../maviSettingsPane.js';


export const MaviSelectionHelperMain = (props: MaviSelectionHelperProps) => {

	const isDark = useIsDark()

	return <div
		className={`@@mavi-scope ${isDark ? 'dark' : ''}`}
	>
		<MaviSelectionHelper {...props} />
	</div>
}



const MaviSelectionHelper = ({ rerenderKey }: MaviSelectionHelperProps) => {


	const accessor = useAccessor()
	const keybindingService = accessor.get('IKeybindingService')
	const commandService = accessor.get('ICommandService')

	const ctrlLKeybind = keybindingService.lookupKeybinding(MAVI_CTRL_L_ACTION_ID)
	const ctrlKKeybind = keybindingService.lookupKeybinding(MAVI_CTRL_K_ACTION_ID)

	const dividerHTML = <div className='w-[0.5px] bg-mavi-border-3'></div>

	const [reactRerenderCount, setReactRerenderKey] = useState(rerenderKey)
	const [clickState, setClickState] = useState<'init' | 'clickedOption' | 'clickedMore'>('init')

	useEffect(() => {
		const disposable = commandService.onWillExecuteCommand(e => {
			if (e.commandId === MAVI_CTRL_L_ACTION_ID || e.commandId === MAVI_CTRL_K_ACTION_ID) {
				setClickState('clickedOption')
			}
		});

		return () => {
			disposable.dispose();
		};
	}, [commandService, setClickState]);


	// rerender when the key changes
	if (reactRerenderCount !== rerenderKey) {
		setReactRerenderKey(rerenderKey)
		setClickState('init')
	}
	// useEffect(() => {
	// }, [rerenderKey, reactRerenderCount, setReactRerenderKey, setClickState])

	// if the user selected an option, close


	if (clickState === 'clickedOption') {
		return null
	}

	const defaultHTML = <>
		{ctrlLKeybind &&
			<div
				className='
					flex items-center px-2 py-1.5
					cursor-pointer
				'
				onClick={() => {
					commandService.executeCommand(MAVI_CTRL_L_ACTION_ID)
					setClickState('clickedOption');
				}}
			>
				<span>Add to Chat</span>
				<span className='ml-1 px-1 rounded bg-[var(--vscode-keybindingLabel-background)] text-[var(--vscode-keybindingLabel-foreground)] border border-[var(--vscode-keybindingLabel-border)]'>
					{ctrlLKeybind.getLabel()}
				</span>
			</div>
		}
		{ctrlLKeybind && ctrlKKeybind &&
			dividerHTML
		}
		{ctrlKKeybind &&
			<div
				className='
					flex items-center px-2 py-1.5
					cursor-pointer
				'
				onClick={() => {
					commandService.executeCommand(MAVI_CTRL_K_ACTION_ID)
					setClickState('clickedOption');
				}}
			>
				<span className='ml-1'>Edit Inline</span>
				<span className='ml-1 px-1 rounded bg-[var(--vscode-keybindingLabel-background)] text-[var(--vscode-keybindingLabel-foreground)] border border-[var(--vscode-keybindingLabel-border)]'>
					{ctrlKKeybind.getLabel()}
				</span>
			</div>
		}

		{dividerHTML}

		<div
			className='
				flex items-center px-0.5
				cursor-pointer
			'
			onClick={() => {
				setClickState('clickedMore');
			}}
		>
			<MoreVertical className="w-4" />
		</div>
	</>


	const moreOptionsHTML = <>
		<div
			className='
				flex items-center px-2 py-1.5
				cursor-pointer
			'
			onClick={() => {
				commandService.executeCommand(MAVI_OPEN_SETTINGS_ACTION_ID);
				setClickState('clickedOption');
			}}
		>
			Disable Suggestions?
		</div>

		{dividerHTML}

		<div
			className='
				flex items-center px-0.5
				cursor-pointer
			'
			onClick={() => {
				setClickState('init');
			}}
		>
			<MoreVertical className="w-4" />
		</div>
	</>

	return <div className='
		pointer-events-auto select-none
		z-[1000]
		rounded-sm shadow-md flex flex-nowrap text-nowrap
		border border-mavi-border-3 bg-mavi-bg-2
		transition-all duration-200
	'>
		{clickState === 'init' ? defaultHTML
			: clickState === 'clickedMore' ? moreOptionsHTML
				: <></>
		}
	</div>
}
