import { createContext, useContext } from "react";

export const EditModeContext = createContext();

export const useEditMode = () => {
	const context = useContext(EditModeContext);
	if (!context) {
		throw new Error("useEditMode must be used within EditModeProvider");
	}
	return context;
};
