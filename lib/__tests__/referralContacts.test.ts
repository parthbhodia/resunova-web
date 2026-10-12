import { describe, expect, it } from "vitest";
import {
  isReferralStatus,
  mapReferralRow,
  referralPipeline,
} from "@/lib/referralContacts";

describe("referralContacts", () => {
  it("maps a DB row into the UI contact shape", () => {
    const contact = mapReferralRow({
      id: "c1",
      company: "Acme",
      contact_name: "Priya Shah",
      contact_title: "Staff engineer",
      contact_url: "https://linkedin.com/in/priya",
      relationship: "alumni",
      status: "contacted",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    expect(contact).toMatchObject({
      id: "c1",
      company: "Acme",
      contactName: "Priya Shah",
      contactTitle: "Staff engineer",
      status: "contacted",
    });
  });

  it("falls back unknown statuses to to_contact", () => {
    expect(isReferralStatus("nope")).toBe(false);
    expect(mapReferralRow({
      id: "c2",
      company: null,
      contact_name: null,
      contact_title: null,
      contact_url: null,
      relationship: null,
      status: "mystery",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }).status).toBe("to_contact");
  });

  it("counts the outreach pipeline", () => {
    const counts = referralPipeline([
      { id: "1", company: "A", contactName: "One", contactTitle: null, contactUrl: null, relationship: "other", status: "to_contact", notes: null, createdAt: "", updatedAt: "" },
      { id: "2", company: "B", contactName: "Two", contactTitle: null, contactUrl: null, relationship: "other", status: "referred", notes: null, createdAt: "", updatedAt: "" },
      { id: "3", company: "C", contactName: "Three", contactTitle: null, contactUrl: null, relationship: "other", status: "referred", notes: null, createdAt: "", updatedAt: "" },
    ]);
    expect(counts.to_contact).toBe(1);
    expect(counts.referred).toBe(2);
    expect(counts.contacted).toBe(0);
  });
});
