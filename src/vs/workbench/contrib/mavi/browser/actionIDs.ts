// Normally you'd want to put these exports in the files that register them, but if you do that you'll get an import order error if you import them in certain cases.
// (importing them runs the whole file to get the ID, causing an import error). I guess it's best practice to separate out IDs, pretty annoying...

export const MAVI_CTRL_L_ACTION_ID = 'codemavi.ctrlLAction'

export const MAVI_CTRL_K_ACTION_ID = 'codemavi.ctrlKAction'

export const MAVI_ACCEPT_DIFF_ACTION_ID = 'codemavi.acceptDiff'

export const MAVI_REJECT_DIFF_ACTION_ID = 'codemavi.rejectDiff'

export const MAVI_GOTO_NEXT_DIFF_ACTION_ID = 'codemavi.goToNextDiff'

export const MAVI_GOTO_PREV_DIFF_ACTION_ID = 'codemavi.goToPrevDiff'

export const MAVI_GOTO_NEXT_URI_ACTION_ID = 'codemavi.goToNextUri'

export const MAVI_GOTO_PREV_URI_ACTION_ID = 'codemavi.goToPrevUri'

export const MAVI_ACCEPT_FILE_ACTION_ID = 'codemavi.acceptFile'

export const MAVI_REJECT_FILE_ACTION_ID = 'codemavi.rejectFile'

export const MAVI_ACCEPT_ALL_DIFFS_ACTION_ID = 'codemavi.acceptAllDiffs'

export const MAVI_REJECT_ALL_DIFFS_ACTION_ID = 'codemavi.rejectAllDiffs'
