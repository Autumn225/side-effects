function itemContext(app, options) {
    let exportIdx = options.findIndex(i => i.label === 'SIDEBAR.Export');
    if (exportIdx === -1) return;
    let option = {
        label: 'SIDEEFFECTS.Macros.ExportForSharing.Label',
        icon: '<i class="fas fa-file-export"></i>',
        visible: li => game.items.get(li.dataset.entryId)?.isOwner,
        onClick: async li => {
            let entryId = li.dataset.entryId;
            let item = game.items.get(entryId);
            if (!item) return;
            exportItemToJSON(item);
        }
    };
    options.splice(exportIdx + 1, 0, option);
}
function exportItemToJSON(document) {
    let data = document.toCompendium(null);
    foundry.utils.setProperty(data, '_statse.exportSource', {
        world: game.world.id,
        system: game.system.id,
        coreVersion: game.version,
        systemVersion: game.system.version
    });
    data.effects.forEach(effect => effect.description = '');
    data.system.description = {chat: '', value: ''};
    if (data.system.unidentified) data.system.unidentified.description = '';
    let filename = ['fvtt', document.documentName, document.name?.slugify(), document.id].filterJoin('-');
    foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), 'text/json', filename + '.json');
}
function actorContext(app, options) {
    let exportIdx = options.findIndex(i => i.label === 'SIDEBAR.Export');
    if (exportIdx === -1) return;
    let option = {
        label: 'SIDEEFFECTS.Macros.ExportForSharing.Label',
        icon: '<i class="fas fa-file-export"></i>',
        visible: li => game.actors.get(li.dataset.entryId)?.isOwner,
        onClick: async li => {
            let entryId = li.dataset.entryId;
            let actor = game.actors.get(entryId);
            if (!actor) return;
            exportActorToJSON(actor);
        }
    };
    options.splice(exportIdx + 1, 0, option);
}
function exportActorToJSON(document) {
    let data = document.toCompendium(null);
    foundry.utils.setProperty(data, '_stats.exportSource', {
        world: game.world.id,
        system: game.system.id,
        coreVersion: game.version,
        systemVersion: game.system.version
    });
    data.effects.forEach(effect => effect.description = '');
    data.items.forEach(item => {
        item.effects.forEach(effect => effect.description = '');
        item.system.description = {chat: '', value: ''};
        if (item.system.unidentified) item.system.unidentified.description = '';
    });
    data.system.details.biography = {public: '', value: ''};
    let filename = ['fvtt', document.documentName, document.name?.slugify(), document.id].filterJoin('-');
    foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), 'text/json', filename + '.json');
}
function toggle(enabled) {
    if (enabled) {
        Hooks.on('getItemContextOptions', itemContext);
        Hooks.on('getActorContextOptions', actorContext);
    } else {
        Hooks.off('getItemContextOptions', itemContext);
        Hooks.off('getActorContextOptions', actorContext);
    }
}
export let exportForSharing = {
    toggle
};