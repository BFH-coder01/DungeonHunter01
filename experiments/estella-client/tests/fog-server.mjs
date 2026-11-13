// Disposable process: the production files and default revealAll flag stay unchanged.
import {CONFIG} from '../../../src/shared/config.js';
CONFIG.revealAll=false;
await import('../../../src/server/index.js');
