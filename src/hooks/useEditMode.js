import { useContext } from "react";
import { EditModeContext } from "../context/EditModeContext";

export const useEditMode = () => {
	const context = useContext(EditModeContext);
	if (!context) {
		throw new Error("useEditMode must be used within EditModeProvider");
	}
	return context;
};
