import {effectHud} from './macros/effectHud.mjs';
import {effects} from './macros/effects.mjs';
import {exportForSharing} from './macros/exportForSharing.mjs';
import {hiddenCompendiums} from './macros/hiddenCompendiums.mjs';
import {customUi} from './macros/ui.mjs';
const settingsData = {
    effectCompendiumCreated: {
        config: false,
        type: Boolean,
        default: false
    },
    statusEffectsAdded: {
        config: false,
        type: Boolean,
        default: false
    },
    effectInterfaceEnabled: {
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    },
    effectCompendium: {
        config: true,
        type: String,
        default: 'world.side-effects',
        requiresReload: true
    },
    effectInterfacePlacement: {
        config: true,
        type: String,
        default: 'macros',
        requiresReload: true,
        choices: Object.keys(CONFIG.ui.sidebar.TABS).reduce((obj, key) => {
            obj[key] = key.capitalize();
            return obj;
        }, {})
    },
    addStatusEffects: {
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: value => {if (!value) game.settings.set('side-effects', 'statusEffectsAdded', false);}
    },
    temporaryEffectHud: {
        config: true,
        type: Boolean,
        default: false,
        onChange: value => effectHud.toggle(value)
    },
    replaceStatusEffectIcons: {
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    },
    removeStatusEffectsFromHud: {
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    },
    removedStatusEffects: {
        config: true,
        type: new foundry.data.fields.SetField(
            new foundry.data.fields.StringField({
                choices: () => CONFIG.statusEffects.reduce((obj, i) => {
                    obj[i.id] = {label: i.name};
                    return obj;
                }, {})
            })
        ),
        default: [
            'bleeding',
            'burrowing',
            'cursed',
            'encumbered',
            'ethereal',
            'exceedingCarryingCapacity',
            'flanked',
            'flanking',
            'flying',
            'heavilyEncumbered',
            'hovering',
            'marked',
            'sleeping',
            'transformed',
            'hiding',
            'stable',
            'surprised',
            'silenced',
            'dodging',
            'burning',
            'dehydration',
            'falling',
            'malnutrition',
            'suffocation'
        ],
        requiresReload: true
    },
    disableSpecialEffects: {
        config: true,
        type: Boolean,
        default: false,
        onChange: value => effects.disableSpecialEffects(value)
    },
    exportForSharing: {
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    },
    hiddenCompendiums: {
        config: false,
        type: Object,
        default: {folders: [], packs: []},
        onChange: () => ui.compendium.render(true)
    },
    uiButtonScale: {
        config: true,
        type: new foundry.data.fields.NumberField({
            min: 0.1,
            max: 3,
            step: 0.1,
            initial: 1
        }),
        scope: 'client',
        onChange: value => customUi.buttonScale(value)
    },
    uiNavigationScale: {
        config: true,
        type: new foundry.data.fields.NumberField({
            min: 0.1,
            max: 3,
            step: 0.1,
            initial: 1
        }),
        scope: 'client',
        onChange: value => customUi.navigationScale(value)
    },
    uiSidebar: {
        config: true,
        type: Boolean,
        default: false,
        scope: 'client',
        onChange: value => customUi.customSidebar(value)
    },
    uiChatMessage: {
        config: true,
        type: Boolean,
        default: false,
        scope: 'client',
        onChange: value => customUi.customChatMessage(value)
    }

};
const menusData = {
    hiddenCompendiums: {
        icon: 'fas fa-book-atlas',
        type: hiddenCompendiums.HiddenCompendiumSelector
    }
};
function addSetting(key, options) {
    const defaultOptions = {
        scope: 'world',
        config: false,
        name: 'SIDEEFFECTS.Settings.' + key.capitalize() + '.Name',
        hint: 'SIDEEFFECTS.Settings.' + key.capitalize() + '.Hint'
    };
    game.settings.register('side-effects', key, foundry.utils.mergeObject(defaultOptions, options));
}
function addMenu(key, options) {
    const defaultOptions = {
        name: 'SIDEEFFECTS.Settings.' + key.capitalize() + '.Name',
        label: 'SIDEEFFECTS.Settings.' + key.capitalize() + '.Label',
        hint: 'SIDEEFFECTS.Settings.' + key.capitalize() + '.Hint'
    };
    game.settings.registerMenu('side-effects', key, foundry.utils.mergeObject(defaultOptions, options));
}
function init() {
    Object.entries(settingsData).sort().forEach(([key, options]) => {
        addSetting(key, options);
    });
    Object.entries(menusData).forEach(([key, options]) => {
        addMenu(key, options);
    });
}
export let settings = {
    init
};