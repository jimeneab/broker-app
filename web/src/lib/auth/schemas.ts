import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Ingresa un email válido.")),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const signupSchema = z.object({
  // 1–50 matches the profiles.display_name CHECK.
  displayName: z.string().trim().min(1, "Ingresa tu nombre.").max(50, "Máximo 50 caracteres."),
  email: z.string().trim().pipe(z.email("Ingresa un email válido.")),
  // 72: bcrypt limit in Supabase Auth.
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72, "Máximo 72 caracteres."),
});
