import { create } from "zustand";
import { CLData, DEFAULT_CL_DATA, CLRecipient, CLAuthor, CLContent, CLCustomization } from "@/components/CoverLetterBuilder/types";
import type { ProfileFormState } from "@/lib/profileStorage";
import { fetchCoverLetterById, upsertCoverLetter, deleteCoverLetter } from "@/lib/supabase";

interface CLStore {
    data: CLData;
    loaded: boolean;
    savedId: string | null;
    label: string;
    saveStatus: "idle" | "saving" | "saved" | "error";

    setLabel: (label: string) => void;
    setRecipient: <K extends keyof CLRecipient>(key: K, val: CLRecipient[K]) => void;
    setAuthor: <K extends keyof CLAuthor>(key: K, val: CLAuthor[K]) => void;
    setContent: <K extends keyof CLContent>(key: K, val: CLContent[K]) => void;
    setCustomization: <K extends keyof CLCustomization>(key: K, val: CLCustomization[K]) => void;
    prefillFromProfile: (profile: ProfileFormState) => void;
    replaceData: (data: CLData) => void;
    reset: () => void;

    loadFromStorage: () => void;
    saveToStorage: () => void;
    
    loadFromServer: (id: string) => Promise<void>;
    saveToServer: () => Promise<void>;
    deleteSaved: (id: string) => Promise<void>;
}

const STORAGE_KEY = "rn-cover-letter-draft";

export const useCoverLetterStore = create<CLStore>((set, get) => {
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let cloudSaveTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            get().saveToStorage();
        }, 400);

        if (cloudSaveTimeout) clearTimeout(cloudSaveTimeout);
        cloudSaveTimeout = setTimeout(() => {
            void get().saveToServer();
        }, 2000);
    };

    return {
        data: { ...DEFAULT_CL_DATA },
        loaded: false,
        savedId: null,
        label: "Untitled Cover Letter",
        saveStatus: "idle",

        setLabel: (label) => {
            set({ label });
            scheduleSave();
        },

        setRecipient: (key, val) => {
            set((s) => ({ data: { ...s.data, recipient: { ...s.data.recipient, [key]: val } } }));
            scheduleSave();
        },

        setAuthor: (key, val) => {
            set((s) => ({ data: { ...s.data, author: { ...s.data.author, [key]: val } } }));
            scheduleSave();
        },

        setContent: (key, val) => {
            set((s) => ({ data: { ...s.data, content: { ...s.data.content, [key]: val } } }));
            scheduleSave();
        },

        setCustomization: (key, val) => {
            set((s) => ({ data: { ...s.data, customization: { ...s.data.customization, [key]: val } } }));
            scheduleSave();
        },

        prefillFromProfile: (profile: ProfileFormState) => {
            const name = (profile.displayName || "").trim();
            set((s) => ({
                data: {
                    ...s.data,
                    author: {
                        ...s.data.author,
                        ...(name && { name }),
                        ...(profile.email && { email: profile.email }),
                        ...(profile.phone && { phone: profile.phone }),
                        ...(profile.linkedin && { linkedin: profile.linkedin }),
                        ...(profile.locations && { location: profile.locations }),
                    }
                }
            }));
            scheduleSave();
        },

        replaceData: (data) => {
            set({ data, loaded: true });
            scheduleSave();
        },

        reset: () => {
            set({ 
                data: { ...DEFAULT_CL_DATA },
                savedId: null,
                label: "Untitled Cover Letter",
                saveStatus: "idle"
            });
            scheduleSave();
        },

        loadFromStorage: () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    set({
                        data: { ...DEFAULT_CL_DATA, ...(parsed.data ?? parsed) },
                        savedId: parsed.savedId ?? null,
                        label: parsed.label ?? "Untitled Cover Letter",
                        loaded: true,
                    });
                    return;
                }
            } catch (e) {
                console.warn("CL load err", e);
            }
            set({ loaded: true });
        },

        saveToStorage: () => {
            try {
                const { data, savedId, label } = get();
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, savedId, label }));
            } catch (e) {
                console.warn("CL save err", e);
            }
        },

        loadFromServer: async (id: string) => {
            try {
                const record = await fetchCoverLetterById(id);
                if (record) {
                    set({ 
                        data: record.data as CLData, 
                        savedId: record.id, 
                        label: record.label,
                        loaded: true 
                    });
                } else {
                    set({ loaded: true });
                }
            } catch (e) {
                console.error("Failed to load cover letter", e);
                set({ loaded: true });
            }
        },

        saveToServer: async () => {
            const { data, label, savedId } = get();
            set({ saveStatus: "saving" });
            try {
                const newId = await upsertCoverLetter(label, data, savedId);
                if (newId) {
                    set({ savedId: newId, saveStatus: "saved" });
                    get().saveToStorage();
                } else {
                    // Logged out or missing session: keep the draft locally saved only.
                    set({ saveStatus: "idle" });
                }
            } catch (e) {
                console.error("Failed to save cover letter to cloud", e);
                set({ saveStatus: "error" });
            }
        },

        deleteSaved: async (id: string) => {
            try {
                await deleteCoverLetter(id);
                if (get().savedId === id) {
                    set({ savedId: null, saveStatus: "idle" });
                    get().saveToStorage();
                }
            } catch (e) {
                console.error("Failed to delete cover letter", e);
            }
        }
    };
});
