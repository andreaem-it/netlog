import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "@node-rs/argon2";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true" ||
    !["localhost", "127.0.0.1", "postgres"].includes(url.hostname) ||
    !process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12) {
  throw new Error("Demo seed requires local database, SEED_DEMO=true and SEED_PASSWORD of at least 12 characters.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
const people = [
  ["Giulia Rossi", "giulia", "Milano", "Fotografie mosse, concerti sotto la pioggia e libri pieni di appunti."],
  ["Marco Bianchi", "marco", "Bologna", "Colleziono dischi e percorsi per tornare a casa a piedi."],
  ["Sofia Costa", "sofia", "Torino", "Design, cinema e domeniche lente."],
  ["Luca Moretti", "luca", "Roma", "Una chitarra e un quaderno sempre con me."],
  ["Elena Ferri", "elena", "Firenze", "Mi perdo volentieri nei musei."],
  ["Davide Conti", "davide", "Napoli", "Cucino per gli amici e corro quando posso."],
  ["Chiara Gallo", "chiara", "Bari", "Il mare anche d’inverno."],
  ["Andrea Villa", "andrea", "Verona", "Tecnologia, montagna e caffè."],
  ["Alice Riva", "alice", "Genova", "Cerco storie nei posti piccoli."],
  ["Matteo Greco", "matteo", "Palermo", "Appunti di viaggio e partite tra amici."],
  ["Sara Romano", "sara", "Parma", "Disegno tutto quello che incontro."],
  ["Francesco Leone", "francesco", "Catania", "Cinema all’aperto, quando si può."],
  ["Martina Fontana", "martina", "Padova", "Le cose semplici, fatte bene."],
  ["Alessandro Ricci", "alessandro", "Trento", "Il prossimo sentiero è sempre il più bello."],
  ["Valentina Serra", "valentina", "Cagliari", "Scrivo, leggo, ricomincio."],
  ["Federico Bruno", "federico", "Pisa", "Bici, fumetti e scoperte."],
  ["Irene Marchetti", "irene", "Trieste", "Un taccuino pieno di idee."],
  ["Simone De Luca", "simone", "Perugia", "Mi piace aggiustare le cose."],
  ["Beatrice Pini", "beatrice", "Lucca", "Fiori sul balcone e jazz in cucina."],
  ["Tommaso Neri", "tommaso", "Ravenna", "Amici, musica e qualche foto."],
] as const;

try {
  const passwordHash = await hash(process.env.SEED_PASSWORD, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  for (const [index, [name, username, city, bio]] of people.entries()) {
    await db.user.upsert({
      where: { email: `${username}@demo.example.test` }, update: {},
      create: { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, name,
        email: `${username}@demo.example.test`, passwordHash,
        profile: { create: { username, city, bio } } },
    });
  }
  console.log("20 profili demo pronti. Credenziali: email @demo.example.test e SEED_PASSWORD configurata.");
} finally { await db.$disconnect(); }
