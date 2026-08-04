const DocumentDirectory = foundry.applications.sidebar.DocumentDirectory;

let effectCollection = null;

class EffectDirectory extends DocumentDirectory {
    static DEFAULT_OPTIONS = {
        collection: 'ActiveEffect'
    };
    static tabName = 'effects';
    get collection() {
        if (!effectCollection) {
            let packId = game.settings.get('side-effects', 'effectCompendium');
            if (!packId) return null;
            let pack = game.packs.get(packId);
            if (!pack) {
                if (!game.settings.get('side-effects', 'effectCompendiumCreated')) return null;
                if (!packId.includes('.')) ui.notifications.error('SIDEEFFECTS.EffectDirectory.InvalidCompendiumId', {localize: true, format: {compendium: packId}, permanent: true});
                else if (packId.includes('world.')) {
                    this.promptCreateCompendium(packId);
                    ui.notifications.error('SIDEEFFECTS.EffectDirectory.InvalidCompendium', {localize: true, format: {compendium: packId}, permanent: true});
                }
                toggleEffectDirectory(false);
                toggleEffectHotbarDrop(false);
                this.close();
                return null;
            }
            effectCollection = pack;
        }
        return effectCollection;
    }
    getDocument(li) {
        return this.collection.get(li.closest('[data-entry-id]').dataset.entryId);
    }
    _getEntryContextOptions() {
        let options = super._getEntryContextOptions();
        options = options.filter(e => !['OWNERSHIP.Configure'].includes(e.label));
        options.unshift({
            icon: 'fa-solid fa-bolt',
            label: 'SIDEEFFECTS.EffectDirectory.AddStatusEffect',
            onClick: this._statusOptionOnClick.bind(this),
            visible: li => this.getDocument(li)?.isOwner && !this.getDocument(li)?.flags['side-effects']?.statusId && this.getDocument(li)?.type === 'base'
        },
        {
            icon: 'fa-solid fa-bolt',
            label: 'SIDEEFFECTS.EffectDirectory.RemoveStatusEffect',
            onClick: this._statusOptionOnClick.bind(this),
            visible: li => this.getDocument(li)?.isOwner && this.getDocument(li)?.flags['side-effects']?.statusId && this.getDocument(li)?.type === 'base'
        });
        let exportOption = options.find(e => e.label === 'SIDEBAR.Export');
        exportOption.onClick = this._exportOptionOnClick.bind(this);
        let importOption = options.find(e => e.label === 'SIDEBAR.Import');
        importOption.onClick = this._importOptionOnClick.bind(this);
        return options;
    }
    async _statusOptionOnClick(event, li) {
        let document = this.getDocument(li);
        if (!document) return;
        let statusId = document.getFlag('side-effects', 'statusId');
        if (statusId) {
            await document.unsetFlag('side-effects', 'statusId');
            if (document.getFlag('side-effects', 'overriddenStatusData')) {
                CONFIG.statusEffects[statusId] = document.getFlag('side-effects', 'overriddenStatusData');
                await document.unsetFlag('side-effects', 'overriddenStatusData');
            } else delete CONFIG.statusEffects[statusId];
        } else {
            let blacklistedStatusEffects = game.settings.get('side-effects', 'blacklistedStatusEffects');
            if (blacklistedStatusEffects.includes(document.name)) {
                ui.notifications.warn('SIDEEFFECTS.EffectDirectory.StatusEffectBlacklisted', {localize: true, format: {effect: document.name}});
                return;
            }
            statusId = document.name.charAt(0).toLowerCase() + document.name.titleCase().slice(1).replaceAll(' ', '');
            await document.setFlag('side-effects', 'statusId', statusId);
            if (CONFIG.statusEffects[statusId]) {
                await document.setFlag('side-effects', 'overriddenStatusData', foundry.utils.duplicate(CONFIG.statusEffects[statusId]));
            }
            CONFIG.statusEffects[statusId] = {
                id: statusId,
                img: document.img,
                name: document.name,
                _id: ('sideeffects' + statusId).padEnd(16, '0').slice(0, 16)
            };
        }
    }
    async _exportOptionOnClick(event, li) {
        let document = this.getDocument(li);
        if (!document) return;
        let effectData = document.toObject();
        delete effectData._id;
        delete effectData.origin;
        let tempEffect = new CONFIG.ActiveEffect.documentClass(effectData);
        if (tempEffect) {
            let data = tempEffect.toCompendium(null);
            data.flags.exportSource = {
                world: game.world.id,
                system: game.system.id,
                coreVersion: game.version,
                systemVersion: game.system.version
            };
            let filename = ['fvtt', tempEffect.documentName, tempEffect.name?.slugify(), tempEffect.id].filterJoin('-');
            foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), 'text/json', filename + '.json');
        }
    }
    async _importOptionOnClick(event, li) {
        let document = this.getDocument(li);
        if (!document) return;
        await foundry.applications.api.DialogV2.wait({
            window: {title: `${_loc('DOCUMENT.ImportData')}: ${this.name}`},
            position: {width: 400},
            content: await foundry.applications.handlebars.renderTemplate('templates/apps/import-data.hbs', {
                hint1: _loc('DOCUMENT.ImportDataHint1', {document: this.documentName}),
                hint2: _loc('DOCUMENT.ImportDataHint2', {name: this.name})
            }),
            buttons: [{
                action: 'import',
                label: 'Import',
                icon: 'fa-solid fa-file-import',
                callback: (event, button) => {
                    const form = button.form;
                    if ( !form.data.files.length ) {
                        return ui.notifications.error('DOCUMENT.ImportDataError', {localize: true});
                    }
                    foundry.utils.readTextFromFile(form.data.files[0]).then(json => importFromJSON(json));
                },
                default: true
            }, {
                action: 'no',
                label: 'COMMON.Cancel',
                icon: 'fa-solid fa-xmark'
            }]
        });
        async function importFromJSON(json) {
            const parsedJSON = JSON.parse(json);
            const doc = await document.constructor.fromImport(parsedJSON);
            let data = doc;
            if (doc instanceof foundry.abstract.Document) {
                data = doc.toObject();
                if ( doc.pack ) foundry.utils.setProperty(data, '_stats.compendiumSource', doc.uuid);
            }
            data.ownership &&= Object.entries(data.ownership).reduce((ownership, [key, level]) => {
                if ( (key === 'default') || game.users.has(key) ) ownership[key] = level;
                return ownership;
            }, {});
            data.ownership ??= {};
            data.ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
            for ( const k of document.constructor.metadata.preserveOnImport ) delete data[k];
            await document.update(data, {diff: false, recursive: false, noHook: true});
            ui.notifications.info('DOCUMENT.Imported', {format: {document: document.documentName, name: document.name}});
            return document;
        }
    }
    _getFolderContextOptions() {
        let options = super._getFolderContextOptions(); 
        options = options.filter(e => !['OWNERSHIP.Configure', 'FOLDER.Export'].includes(e.label));
        return options;
    }
    _hydrateTree(node, pack) {
        if (!node) return null;
        return {
            ...node,
            entries: (node.entries || []).map(indexData => {
                const liveDoc = pack.get(indexData._id);
                if (liveDoc) {
                    if (!Object.hasOwn(liveDoc, 'visible')) {
                        Object.defineProperty(liveDoc, 'visible', {value: true, configurable: true});
                    }
                    return liveDoc; 
                }
                return indexData;
            }),
            children: (node.children || []).map(child => this._hydrateTree(child, pack)).filter(Boolean)
        };
    }
    async promptCreateCompendium(packId) {
        if (!game.settings.get('side-effects', 'effectCompendiumCreated')) return;
        let compendiumId = packId.replace(/^[^.]*\./, '');
        let compendiumName = compendiumId.replace('-', ' ').titleCase();
        let prompt = `<p style="text-align: center;">` + _loc('SIDEEFFECTS.EffectDirectory.CreateCompendium.Prompt', {compendiumName: compendiumName, compendiumId: compendiumId}) + `</p>`;
        let response = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: _loc('SIDEEFFECTS.EffectDirectory.CreateCompendium.Title')
            },
            content: prompt,
            yes: {
                callback: () => this.createCompendium(compendiumId, compendiumName)
            }
        });
        if (response) {
            //reload whole thing.
            window.location.reload();

        } else ui.notifications.error('SIDEEFFECTS.EffectDirectory.InvalidCompendium', {localize: true, format: {compendium: packId}, permanent: true});
    }
    async createCompendium(compendiumId, compendiumName) {
        await foundry.documents.collections.CompendiumCollection.createCompendium({
            label: compendiumName,
            name: compendiumId,
            type: 'ActiveEffect',
            packageType: 'world'
        });
        return true;
    }
    _canRender(options) {
        let packId = game.settings.get('side-effects', 'effectCompendium');
        if (!packId) return false;
        let pack = game.packs.get(packId);
        if (!pack) {
            if (!game.settings.get('side-effects', 'effectCompendiumCreated')) return false;
            if (!packId.includes('.')) ui.notifications.error('SIDEEFFECTS.EffectDirectory.InvalidCompendiumId', {localize: true, format: {compendium: packId}});
            else if (packId.includes('world.')) this.promptCreateCompendium(packId);
            toggleEffectDirectory(false);
            toggleEffectHotbarDrop(false);
            return false;
        }
        return super._canRender(options);
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const pack = this.collection;
        await pack.getDocuments();
        const sourceTree = context.tree || pack.tree || {root: true, entries: [], children: [], depth: 0};
        context.tree = this._hydrateTree(sourceTree, pack);
        
        return context;
    }
    async _preparePartContext(partId, context, options) {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partContext.tree) {
            partContext.tree = this._hydrateTree(partContext.tree, this.collection);
        }
        return partContext;
    }
}
// Toggles
function toggleEffectDirectory(enabled) {
    if (enabled) {
        CONFIG.ui.effects = EffectDirectory;
        let tabs = Object.entries(CONFIG.ui.sidebar.TABS);
        let tabIdx = tabs.findIndex(i => i[0] === game.settings.get('side-effects', 'effectInterfacePlacement'));
        if (tabIdx === -1) tabIdx = tabs.length - 1;
        tabs.splice(tabIdx + 1, 0, ['effects', {
            tooltip: 'Effects',
            icon: 'fa-solid fa-person-rays',
            gmOnly: false
        }]);
        CONFIG.ui.sidebar.TABS = Object.fromEntries(tabs);
    } else {
        delete CONFIG.ui.effects;
        let tabs = Object.entries(CONFIG.ui.sidebar.TABS);
        tabs = tabs.filter(i => i[0] !== 'effects');
        CONFIG.ui.sidebar.TABS = Object.fromEntries(tabs);
    }
}
function toggleEffectHotbarDrop(enabled) {
    if (enabled) Hooks.on('hotbarDrop', effectHotbarDrop); 
    else Hooks.off('hotbarDrop', effectHotbarDrop);
}
function effectHotbarDrop(hotbar, data, slot) {
    let packUuid = 'Compendium.' + game.settings.get('side-effects', 'effectCompendium');
    if (!data.uuid.includes(packUuid)) return;
    let doc = fromUuidSync(data.uuid);
    let command = `await token.actor.createEmbeddedDocuments('ActiveEffect', [fromUuidSync('` + data.uuid + `').toObject()]);`;
    foundry.documents.Macro.implementation.create({
        name: doc.name,
        type: CONST.MACRO_TYPES.SCRIPT,
        img: doc.img,
        command
    }).then((macro) => {
        game.user.assignHotbarMacro(macro, slot, {fromSlot: data.slot});
    });
    return false;
}
async function readyStatusEffects(enabled) {
    if (!enabled) return;
    let collection = foundry.ui.effects.collection;
    if (!collection) return;
    let added = await addStatusEffects(collection);
    if (added) await game.settings.set('side-effects', 'statusEffectsAdded', true);
    let documents = await collection.getDocuments();
    if (!documents) return;
    let blacklistedStatusEffects = game.settings.get('side-effects', 'blacklistedStatusEffects');
    let statusDocuments = documents.filter(i => i.flags['side-effects']?.statusId && i.type === 'base' && !blacklistedStatusEffects.includes(i.name));
    registerCustomStatusEffects(statusDocuments);
}
async function addStatusEffects(collection) {
    let documents = await collection.getDocuments();
    if (!documents) return;
    let statusDocuments = documents.filter(i => i.flags['side-effects']?.statusId && i.type === 'base');
    let statusEffectsAdded = game.settings.get('side-effects', 'statusEffectsAdded');
    if (statusEffectsAdded) return;
    let addStatusEffects = game.settings.get('side-effects', 'addStatusEffects');
    if (!addStatusEffects) return;
    let statusIds = statusDocuments.map(i => i.flags['side-effects'].statusId);
    let blacklistedStatusEffects = game.settings.get('side-effects', 'blacklistedStatusEffects');
    let statusEffects = foundry.utils.deepClone(CONFIG.statusEffects).filter(e => !statusIds.includes(e.id) && !blacklistedStatusEffects.includes(e.name));
    if (!statusEffects.length) return;
    let folder = collection.folders.find(f => f.name === _loc('SIDEEFFECTS.EffectDirectory.StatusEffectsFolder.Name'));
    if (!folder) {
        let folderData = {
            name: _loc('SIDEEFFECTS.EffectDirectory.StatusEffectsFolder.Name'),
            type: 'ActiveEffect'
        };
        let folderContext = {
            pack: collection.collection
        };
        folder = await foundry.documents.Folder.create(folderData, folderContext);
    }
    let folderId = folder.id;
    return Promise.all(statusEffects.map(async effect => {
        effect.folder = folderId;
        if (effect.flags) effect.flags['side-effects'] = {statusId: effect.id};
        else effect.flags = {'side-effects': {statusId: effect.id}};
        if (effect.reference) effect.description = `@Embed[${effect.reference} inline]`;
        await collection.documentClass.create(effect, {pack: collection.collection});
    }));
}
function registerCustomStatusEffects(statusDocuments) {
    if (!statusDocuments.length) return;
    statusDocuments.forEach(effect => {
        let statusId = effect.flags['side-effects'].statusId;
        let status = CONFIG.statusEffects[statusId];
        let statusData = {
            id: statusId,
            img: effect.img,
            name: effect.name,
            _id: ('sideeffects' + statusId).padEnd(16, '0').slice(0, 16)
        };
        if (status) statusData = foundry.utils.mergeObject(foundry.utils.duplicate(status), statusData);
        CONFIG.statusEffects[statusId] = statusData;
    });
}
function preCreateActiveEffect(effect, updates, options, userId) {
    let statusId = updates.name.charAt(0).toLowerCase() + updates.name.titleCase().slice(1).replaceAll(' ', '');
    let collection = foundry.ui.effects.collection;
    if (!collection) return;
    let documents = collection.contents;
    if (!documents) return;
    let statusDocument = documents.find(i => i.flags['side-effects']?.statusId === statusId);
    if (!statusDocument) return;
    let statusData = statusDocument.toObject();
    statusData.showIcon = updates.showIcon;
    statusData.statuses = updates.statuses;
    delete statusData._id;
    delete statusData.origin;
    effect.updateSource(statusData);
}
// Hooks
function init() {
    if (!game.settings.get('side-effects', 'effectInterfaceEnabled')) return;
    toggleEffectDirectory(true);
    toggleEffectHotbarDrop(true);
}
function setup() {
    let compendiumCreated = game.settings.get('side-effects', 'effectCompendiumCreated');
    let compendium = game.packs.get(game.settings.get('side-effects', 'effectCompendium'));
    if (!compendium && !compendiumCreated) {
        foundry.documents.collections.CompendiumCollection.createCompendium({
            label: 'Side Effects',
            name: 'side-effects',
            type: 'ActiveEffect',
            packageType: 'world'
        });
        Hooks.once('ready', () => {
            game.settings.set('side-effects', 'effectCompendiumCreated', true);
        });
    }
}
async function ready() {
    if (!game.settings.get('side-effects', 'effectInterfaceEnabled')) return;
    await readyStatusEffects(true);
    Hooks.on('preCreateActiveEffect', preCreateActiveEffect);
}
export let effectInterface = {
    init,
    setup,
    ready
};