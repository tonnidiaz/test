import {useState} from "react"

export const useBetterState = (value) => {
    const [state, setState] = useState(value)
    return {
      get value() {
        return state
      },
      set value(v) {
        setState(v)
      }
    }
  }