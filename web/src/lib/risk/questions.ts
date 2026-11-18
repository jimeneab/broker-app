export type RiskProfile = "conservador" | "moderado" | "agresivo";

type Question = { title: string; options: readonly [string, string, string, string] };

/** The 6 questions in order; options[k] is worth k + 1 points. Exact copy from 01-product.md. Text only: no thresholds here. */
export const RISK_QUESTIONS: readonly Question[] = [
  {
    title: "¿Cuánto tiempo piensas mantener tus inversiones antes de necesitar ese dinero?",
    options: ["Menos de 1 año", "Entre 1 y 3 años", "Entre 3 y 7 años", "Más de 7 años"],
  },
  {
    title: "Si tus inversiones cayeran un 20% en pocas semanas, ¿qué harías?",
    options: [
      "Vendería todo para no perder más",
      "Vendería una parte",
      "Esperaría sin hacer cambios",
      "Compraría más aprovechando el precio bajo",
    ],
  },
  {
    title: "¿Cuál es tu objetivo principal al invertir?",
    options: [
      "Proteger mi dinero aunque gane poco",
      "Obtener ingresos estables con poco riesgo",
      "Hacer crecer mi dinero con un riesgo moderado",
      "Maximizar el crecimiento aunque haya mucha volatilidad",
    ],
  },
  {
    title: "¿Cuánta experiencia tienes invirtiendo?",
    options: [
      "Ninguna, nunca he invertido",
      "Poca: solo ahorro, depósitos o fondos",
      "Algo: he comprado acciones o ETFs",
      "Mucha: invierto con frecuencia en acciones, ETFs u otros instrumentos",
    ],
  },
  {
    title: "¿Qué porcentaje de tu patrimonio invertirías en la bolsa?",
    options: ["Menos del 10%", "Entre 10% y 25%", "Entre 25% y 50%", "Más del 50%"],
  },
  {
    title: "¿Qué tan estables son tus ingresos?",
    options: ["Inestables o sin ingresos fijos", "Algo variables", "Estables", "Muy estables y con un fondo de emergencia"],
  },
];

export const RISK_PROFILES: Record<RiskProfile, { label: string; description: string }> = {
  conservador: {
    label: "Conservador",
    description:
      "Priorizas proteger tu dinero sobre ganar más. Te sientes mejor con inversiones estables y de baja volatilidad, aunque crezcan despacio.",
  },
  moderado: {
    label: "Moderado",
    description:
      "Buscas un equilibrio entre crecimiento y seguridad. Aceptas altibajos moderados a cambio de un mejor rendimiento a mediano plazo.",
  },
  agresivo: {
    label: "Agresivo",
    description:
      "Buscas el mayor crecimiento posible y toleras caídas fuertes en el camino. Tienes un horizonte largo para recuperarte de la volatilidad.",
  },
};

export const RISK_DISCLAIMER = "Este perfil es orientativo y no es una recomendación de inversión.";
