/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Color, RGBA } from '../../../../../base/common/color.js';
import { registerColor } from '../../../../../platform/theme/common/colorUtils.js';

// ============================================================
// CODE MAVI IDE - BRAND COLOR PALETTE
// ============================================================
// Primary Mavi Blue
export const MAVI_PRIMARY = '#0066CC';        // Ana mavi - logo ve ana vurgular
export const MAVI_PRIMARY_LIGHT = '#3399FF'; // Açık mavi - hover durumları
export const MAVI_PRIMARY_DARK = '#004499';  // Koyu mavi - aktif durumlar

// Accent Colors
export const MAVI_ACCENT = '#00A3BF';        // Turkuaz - ikincil vurgular
export const MAVI_GLOW = '#007FD4';          // Focus glow rengi

// Semantic Colors
export const MAVI_SUCCESS = '#1E7A3E';       // Yeşil - başarı/onay
export const MAVI_SUCCESS_LIGHT = '#22A34A'; // Açık yeşil
export const MAVI_ERROR = '#C9283D';         // Kırmızı - hata/reddet
export const MAVI_ERROR_LIGHT = '#E03E52';   // Açık kırmızı

// Neutral Colors
export const MAVI_NEUTRAL_100 = '#FFFFFF';
export const MAVI_NEUTRAL_200 = '#F5F5F5';
export const MAVI_NEUTRAL_300 = '#E0E0E0';
export const MAVI_NEUTRAL_400 = '#BDBDBD';
export const MAVI_NEUTRAL_500 = '#9E9E9E';
export const MAVI_NEUTRAL_600 = '#757575';
export const MAVI_NEUTRAL_700 = '#616161';
export const MAVI_NEUTRAL_800 = '#424242';
export const MAVI_NEUTRAL_900 = '#212121';

// ============================================================
// editCodeService colors - Mavi themed
// ============================================================
const sweepBG = new Color(new RGBA(0, 102, 204, .15));      // Mavi sweep
const highlightBG = new Color(new RGBA(0, 102, 204, .08));  // Mavi highlight
const sweepIdxBG = new Color(new RGBA(0, 163, 191, .4));    // Turkuaz index

const acceptBG = new Color(new RGBA(30, 122, 62, .15));     // Mavi-yeşil accept
const rejectBG = new Color(new RGBA(201, 40, 61, .15));     // Mavi-kırmızı reject

// Widget colors - Mavi themed
export const acceptAllBg = '#1E7A3E'           // Mavi-yeşil accept all
export const acceptBg = '#22A34A'              // Açık yeşil accept
export const acceptBorder = '1px solid #1E7A3E'

export const rejectAllBg = '#C9283D'           // Mavi-kırmızı reject all
export const rejectBg = '#E03E52'              // Açık kırmızı reject
export const rejectBorder = '1px solid #A02030'

export const buttonFontSize = '11px'
export const buttonTextColor = 'white'

// Mavi brand button colors
export const maviPrimaryBg = MAVI_PRIMARY
export const maviPrimaryHover = MAVI_PRIMARY_LIGHT
export const maviPrimaryActive = MAVI_PRIMARY_DARK
export const maviPrimaryBorder = '1px solid #004C99'

const configOfBG = (color: Color) => {
	return { dark: color, light: color, hcDark: color, hcLight: color, }
}

// gets converted to --vscode-mavi-greenBG, see mavi.css, asCssVariable
registerColor('mavi.greenBG', configOfBG(acceptBG), '', true);
registerColor('mavi.redBG', configOfBG(rejectBG), '', true);
registerColor('mavi.sweepBG', configOfBG(sweepBG), '', true);
registerColor('mavi.highlightBG', configOfBG(highlightBG), '', true);
registerColor('mavi.sweepIdxBG', configOfBG(sweepIdxBG), '', true);

// Mavi brand colors
registerColor('mavi.primary', configOfBG(new Color(new RGBA(0, 102, 204, 1))), '', true);
registerColor('mavi.primaryLight', configOfBG(new Color(new RGBA(51, 153, 255, 1))), '', true);
registerColor('mavi.primaryDark', configOfBG(new Color(new RGBA(0, 68, 153, 1))), '', true);
registerColor('mavi.accent', configOfBG(new Color(new RGBA(0, 163, 191, 1))), '', true);
