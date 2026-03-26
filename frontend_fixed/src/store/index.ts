import { configureStore } from '@reduxjs/toolkit';
import { pmApi } from '../services/pmApi';

export const store = configureStore({
  reducer: {
    [pmApi.reducerPath]: pmApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(pmApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
