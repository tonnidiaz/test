import {strategies as ceSmaStrategies} from './ce-sma'
import {strategies as slTpStrategies} from './sl-tp'
import {strategies as macdStrategies} from './macd'

export const objStrategies = [...macdStrategies,...ceSmaStrategies, ...slTpStrategies]
export const strategies =objStrategies.map(e=> e.toJson())
