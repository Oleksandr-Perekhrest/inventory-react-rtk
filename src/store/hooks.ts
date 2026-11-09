// outsource dependencies
import { useDispatch, useSelector } from "react-redux";

// local dependencies
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
