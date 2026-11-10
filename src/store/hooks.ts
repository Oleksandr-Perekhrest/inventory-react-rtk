// outsource dependencies
import { useStore, useDispatch, useSelector } from "react-redux";

// local dependencies
import type { AppStore, RootState, AppDispatch } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
