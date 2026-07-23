export function getUserDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const match = email.match(/@([^@]+)$/);
  return match ? match[1].toLowerCase() : null;
}

export type InstitutionSlug = "umbc" | "monroe";

const INSTITUTION_BY_DOMAIN: Readonly<Record<string, InstitutionSlug>> = {
  "umbc.edu": "umbc",
  "monroeu.edu": "monroe",
};

export function getUserInstitution(email: string | null | undefined): InstitutionSlug | null {
  const domain = getUserDomain(email);
  return domain ? INSTITUTION_BY_DOMAIN[domain] ?? null : null;
}

export function isInstitutionUser(email: string | null | undefined): boolean {
  return getUserInstitution(email) !== null;
}

export function isUmbcUser(email: string | null | undefined): boolean {
  return getUserInstitution(email) === "umbc";
}
