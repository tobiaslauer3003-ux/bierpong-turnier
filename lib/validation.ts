import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Mindestens 3 Zeichen")
  .max(20, "Maximal 20 Zeichen")
  .regex(/^[a-zA-Z0-9_]+$/, "Nur Buchstaben, Zahlen und Unterstriche erlaubt");

export const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen");

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Passwort erforderlich"),
});

export const teamNameSchema = z
  .string()
  .trim()
  .min(2, "Mindestens 2 Zeichen")
  .max(40, "Maximal 40 Zeichen");

export const tournamentNameSchema = z
  .string()
  .trim()
  .min(2, "Mindestens 2 Zeichen")
  .max(60, "Maximal 60 Zeichen");

const FAKE_EMAIL_DOMAIN = "bierpong.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}
