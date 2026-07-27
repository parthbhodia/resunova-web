"use client";
/**
 * Binds the canvas's editing handles to the Template Builder store.
 *
 * Bullets are stored as one newline-joined string per entry, not an array, so
 * every bullet operation is a split/mutate/join round trip. That is the
 * schema's shape, not a choice made here — keeping the conversion in one place
 * is the point, so the canvas never has to know it.
 */
import { useMemo } from "react";
import type { TemplateBuilderStore } from "@/store/templateBuilderStore";
import type { CanvasEdit, CanvasEntryKind } from "./canvasTypes";

const splitBullets = (raw: string) =>
  raw.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

export function useCanvasEdit(
  store: TemplateBuilderStore,
  opts: { onAi?: (kind: CanvasEntryKind, id: string) => void; aiLocked?: boolean } = {},
): CanvasEdit {
  const { onAi, aiLocked } = opts;

  return useMemo<CanvasEdit>(() => {
    const bulletsOf = (kind: CanvasEntryKind, id: string): string[] => {
      const d = store.data;
      const entry = kind === "experience"
        ? d.workExperiences.find((w) => w.id === id)
        : kind === "project"
          ? d.projects.find((p) => p.id === id)
          : undefined;
      return entry ? splitBullets(entry.bullets) : [];
    };

    const writeBullets = (kind: CanvasEntryKind, id: string, next: string[]) => {
      const joined = next.filter((b) => b.trim()).join("\n");
      if (kind === "experience") store.setWork(id, "bullets", joined);
      else if (kind === "project") store.setProject(id, "bullets", joined);
    };

    return {
      setField: (path, value) => {
        // "profile.summary" | "work.<id>.<field>" | "edu.<id>.<field>" | "proj.<id>.<field>"
        const [root, a, b] = path.split(".");
        if (root === "profile") store.setProfile(a as never, value);
        else if (root === "work") store.setWork(a, b as never, value);
        else if (root === "edu") store.setEducation(a, b as never, value);
        else if (root === "proj") store.setProject(a, b as never, value);
      },

      setBullet: (kind, id, index, value) => {
        const list = bulletsOf(kind, id);
        // A bullet emptied on the canvas is a delete — that is what the user
        // just did to it, and leaving a blank row on the paper would be worse.
        if (!value.trim()) list.splice(index, 1);
        else list[index] = value;
        writeBullets(kind, id, list);
      },

      addBullet: (kind, id) => writeBullets(kind, id, [...bulletsOf(kind, id), "New achievement"]),

      removeBullet: (kind, id, index) => {
        const list = bulletsOf(kind, id);
        list.splice(index, 1);
        writeBullets(kind, id, list);
      },

      removeEntry: (kind, id) => {
        if (kind === "experience") store.removeWork(id);
        else if (kind === "education") store.removeEducation(id);
        else store.removeProject(id);
      },

      moveEntry: (kind, from, to) => {
        if (kind === "experience") store.moveWork(from, to);
        else if (kind === "education") store.moveEducation(from, to);
        else store.moveProject(from, to);
      },

      setSkillLine: (index, value) => {
        const list = splitBullets(store.data.skills.descriptions);
        if (!value.trim()) list.splice(index, 1); else list[index] = value;
        store.setSkillDescriptions(list.join("\n"));
      },

      setCustomLine: (sectionId, index, value) => {
        const section = store.data.customSections.find((c) => c.id === sectionId);
        if (!section) return;
        const list = splitBullets(section.lines);
        if (!value.trim()) list.splice(index, 1); else list[index] = value;
        store.setCustomSection(sectionId, "lines", list.join("\n"));
      },

      setCustomTitle: (sectionId, value) => store.setCustomSection(sectionId, "title", value),

      onAi,
      aiLocked,
    };
  }, [store, onAi, aiLocked]);
}
