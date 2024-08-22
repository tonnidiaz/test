import {strategies as ceSmaStrategies} from './ce-sma'
import {strategies as slTpStrategies} from './sl-tp'
import {strategies as macdStrategies} from './macd'
import { DefTester } from './def'
import { DefTester60 } from './def-60'
import { Cloud5 } from './cloud-5'
import { Impr5 } from './impr-5'

export const objStrategies = [...macdStrategies,...ceSmaStrategies, ...slTpStrategies]
export const strategies =objStrategies.map(e=> e.toJson())
export const parentStrategies = {
    def5: DefTester,
    def60: DefTester60,
    cloud5: Cloud5,
    impr5: Impr5
}
