/* ==========================================================================
   Quench Test Registration
   Registers FoundryAI's Quench batches when Quench is active in the world.
   The `quenchReady` hook only fires if Quench is installed, so this is a
   no-op (and adds no runtime cost) when it isn't.
   ========================================================================== */

import registerSmokeBatch from './batches/smoke'
import registerTokenEstimatorBatch from './batches/token-estimator'
import registerSettingsBatch from './batches/settings'
import registerToolSystemBatch from './batches/tool-system'

const BATCH_REGISTRARS = [registerSmokeBatch, registerTokenEstimatorBatch, registerSettingsBatch, registerToolSystemBatch]

Hooks.once('quenchReady', (quench: Quench) => {
	for (const register of BATCH_REGISTRARS) {
		register(quench)
	}
})
