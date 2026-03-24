// Normally you'd want to put these exports in the files that register them, but if you do that you'll get an import order error if you import them in certain cases.
// (importing them runs the whole file to get the ID, causing an import error). I guess it's best practice to separate out IDs, pretty annoying...

export const MAVI_CTRL_L_ACTION_ID = 'mavi.ctrlLAction'

export const MAVI_CTRL_K_ACTION_ID = 'mavi.ctrlKAction'

export const MAVI_ACCEPT_DIFF_ACTION_ID = 'mavi.acceptDiff'

export const MAVI_REJECT_DIFF_ACTION_ID = 'mavi.rejectDiff'

export const MAVI_GOTO_NEXT_DIFF_ACTION_ID = 'mavi.goToNextDiff'

export const MAVI_GOTO_PREV_DIFF_ACTION_ID = 'mavi.goToPrevDiff'

export const MAVI_GOTO_NEXT_URI_ACTION_ID = 'mavi.goToNextUri'

export const MAVI_GOTO_PREV_URI_ACTION_ID = 'mavi.goToPrevUri'

export const MAVI_ACCEPT_FILE_ACTION_ID = 'mavi.acceptFile'

export const MAVI_REJECT_FILE_ACTION_ID = 'mavi.rejectFile'

export const MAVI_ACCEPT_ALL_DIFFS_ACTION_ID = 'mavi.acceptAllDiffs'

export const MAVI_REJECT_ALL_DIFFS_ACTION_ID = 'mavi.rejectAllDiffs'
