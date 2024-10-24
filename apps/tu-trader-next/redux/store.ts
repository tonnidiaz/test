import { configureStore } from "@reduxjs/toolkit"
import user from "./reducers/user"
import app from "./reducers/app"

export const store = configureStore({
  reducer: {
    user, app
  }
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch