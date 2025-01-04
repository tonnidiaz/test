import {strategies as ceSmaStrategies} from './ce-sma'
import {strategies as slTpStrategies} from './sl-tp'
import {strategies as macdStrategies} from './macd'
import { DefTester } from './def'
import { Def5Adv } from './def5-adv'
import { DefTester60 } from './def-60'
import { Cloud5 } from './cloud-5'
import { Impr5 } from './impr-5'
import { Trailer } from './trailer'
import { Legacy } from './legacy'
import { TrailFromClose } from './trail-from-close'
import { SLTP } from './sltp'

export const objStrategies = [...macdStrategies,...ceSmaStrategies, ...slTpStrategies]
/* 
[
  '1. MACD_ONLY',   '2. MACD_EXT',
  '3. MA_ONLY',     '4. MA_EXT',
  '5. MACD_MA',     '6. MACD_OR_MA',
  '7. MA_RSI',      '8. HL',
  '9. HL_HA',       '10. HL_HA_RSI',
  '11. RITA',       '12. CE_ONLY',
  '13. CE_MA',      '14. CE_MACD',
  '15. ACCS_BANDS', '16. ANY',
  '17. ThreeSum',   '18. RSI_ONLY'
]

*/

export const strategies =objStrategies.map(e=> e.toJson())
export const parentStrategies = {
    def5: DefTester,
    def5_adv: Def5Adv,
    def60: DefTester60,
    cloud5: Cloud5,
    impr5: Impr5,
    trailer: Trailer, legacy: Legacy,
    tfc: TrailFromClose,
    sltp: SLTP,
}

