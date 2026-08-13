import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { trades } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

function numberValue(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to view your journal." }, { status: 401 });

  try {
    const rows = await getDb().select().from(trades).where(eq(trades.userId, user.userId)).orderBy(desc(trades.date), desc(trades.id));
    return Response.json({ trades: rows });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to save a trade." }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const ticker = String(payload.ticker ?? "").trim().toUpperCase();
    const date = String(payload.date ?? "");
    const side = payload.side === "Short" ? "Short" : "Long";
    const status = payload.status === "Loss" ? "Loss" : payload.status === "Open" ? "Open" : "Win";
    const values = ["entry", "stop", "target", "size", "leverage", "pnl", "ratio"].map((key) => numberValue(payload[key]));
    const [entry, stop, target, size, leverage, pnl, ratio] = values;
    const exit = payload.exit === null ? null : numberValue(payload.exit);

    if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(date) || values.some((value) => value === null) || (payload.exit !== null && payload.exit !== undefined && exit === null)) {
      return Response.json({ error: "Please provide complete trade details." }, { status: 400 });
    }

    const [trade] = await getDb().insert(trades).values({
      userId: user.userId, date, ticker, side, entry: entry!, exit, stop: stop!, target: target!, size: size!, leverage: leverage!, pnl: pnl!, ratio: ratio!, strategy: String(payload.strategy ?? "Opening range"), status,
    }).returning();
    return Response.json({ trade }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
