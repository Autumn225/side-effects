import {effectInterface} from './applications/effectDirectory.mjs';
import {settings} from './settings.mjs';
import {macros} from './macros.mjs';
Hooks.once('init', () => {
    settings.init();
    effectInterface.init();
    macros.init();
});
Hooks.on('setup', () => {
    effectInterface.setup();
});
Hooks.once('ready', async () => {
    await macros.ready();
    await effectInterface.ready();
    await macros.postReady();
});