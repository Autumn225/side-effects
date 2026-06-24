import {effects} from './macros/effects.mjs';
import {effectHud} from './macros/effectHud.mjs';
import {exportForSharing} from './macros/exportForSharing.mjs';
import {hiddenCompendiums} from './macros/hiddenCompendiums.mjs';
import {customUi} from './macros/ui.mjs';

function init() {
    if (game.settings.get('side-effects', 'exportForSharing')) exportForSharing.toggle(true);
    customUi.buttonScale(game.settings.get('side-effects', 'uiButtonScale'));
    customUi.navigationScale(game.settings.get('side-effects', 'uiNavigationScale'));
    if (game.settings.get('side-effects', 'uiSidebar')) customUi.customSidebar(true);
    if (game.settings.get('side-effects', 'uiChatMessage')) customUi.customChatMessage(true, 'init');
}

async function ready() {
    if (game.settings.get('side-effects', 'replaceStatusEffectIcons')) effects.setStatusEffectIcons();
    if (game.settings.get('side-effects', 'disableSpecialEffects')) effects.disableSpecialEffects(true);
    if (game.settings.get('side-effects', 'temporaryEffectHud')) effectHud.toggle(true);
    hiddenCompendiums.toggle(true);
}

async function postReady() {
    if (game.settings.get('side-effects', 'removeStatusEffectsFromHud')) effects.removeStatusEffectsFromHud();
}

export let macros = {
    init,
    ready,
    postReady
};