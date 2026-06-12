import { create } from "zustand";
import { CLData, DEFAULT_CL_DATA, CLRecipient, CLAuthor, CLContent, CLCustomization } from "@/components/CoverLetterBuilder/types";
import type { ProfileFormState } from "@/lib/profileStorage";

interface CLStore {
    data: CLData;
    loaded: boolean;
    savedId: string | null;

    setRecipient: <K extends keyof CLRecipient>(key: K, val: CLRecipient[K]) => void;
    setAuthor: <K extends keyof CLAuthor>(key: K, val: CLAuthor[K]) => void;
    setContent: <K extends keyof CLContent>(key: K, val: CLContent[K]) => void;
    setCustomization: <K extends keyof CLCustomization>(key: K, val: CLCustomization[K]) => void;
    prefillFromProfile: (profile: ProfileFormState) => void;
    replaceData: (data: CLData) => void;
    reset: () => void;

    loadFromStorage: () => void;
    saveToStorage: () => void;
}

const STORAGE_KEY = "rn-cover-letter-draft";

export const useCoverLetterStore = create<CLStore>((set, get) => {
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            get().saveToStorage();
        }, 400);
    };

    return {
        data: { ...DEFAULT_CL_DATA },
        loaded: false,
        savedId: null,

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
            const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
            set((s) => ({
                data: {
                    ...s.data,
                    author: {
                        ...s.data.author,
                        ...(name && { name }),
                        ...(profile.email && { email: profile.email }),
                        ...(profile.phone && { phone: profile.phone }),
                        ...(profile.linkedinUrl && { linkedin: profile.linkedinUrl }),
                        ...(profile.location && { location: profile.location }),
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
            set({ data: { ...DEFAULT_CL_DATA } });
            scheduleSave();
        },

        loadFromStorage: () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    set({ data: { ...DEFAULT_CL_DATA, ...parsed }, loaded: true });
                    return;
                }
            } catch (e) {
                console.warn("CL load err", e);
            }
            set({ loaded: true });
        },

        saveToStorage: () => {
            try {
                const { data } = get();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                console.warn("CL save err", e);
            }
        }
    };
});
