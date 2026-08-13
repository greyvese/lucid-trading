import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { trades } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

function tradeId(value: string) { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }
function value(value: unknown) { const result = Number(value); return Number.isFinite(result) ? result : null; }

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to update a trade." }, { status: 401 });
  const id = tradeId((await params).id);
  if (!id) return Response.json({ error: "Invalid trade." }, { status: 400 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const numeric = ["entry", "stop", "target", "size", "leverage", "pnl", "ratio"].map((key) => value(payload[key]));
    const [entry, stop, target, size, leverage, pnl, ratio] = numeric;
    const exit = payload.exit === null ? null : value(payload.exit);
    const ticker = String(payload.ticker ?? "").trim().toUpperCase();
    const date = String(payload.date ?? "");
    if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(date) || numeric.some((item) => item === null) || (payload.exit !== null && payload.exit !== undefined && exit === null)) return Response.json({ error: "Please provide complete trade details." }, { status: 400 });
    const status = payload.status === "Loss" ? "Loss" : payload.status === "Open" ? "Open" : "Win";
    const [trade] = await getDb().update(trades).set({ date, ticker, side: payload.side === "Short" ? "Short" : "Long", entry: entry!, exit, stop: stop!, target: target!, size: size!, leverage: leverage!, pnl: pnl!, ratio: ratio!, strategy: String(payload.strategy ?? "Opening range"), status }).where(and(eq(trades.id, id), eq(trades.userId, user.userId))).returning();
    if (!trade) return Response.json({ error: "Trade not found." }, { status: 404 });
    return Response.json({ trade });
  } catch { return Response.json({ error: "Unable to update this trade." }, { status: 500 }); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to delete a trade." }, { status: 401 });
  const id = tradeId((await params).id);
  if (!id) return Response.json({ error: "Invalid trade." }, { status: 400 });
  const deleted = await getDb().delete(trades).where(and(eq(trades.id, id), eq(trades.userId, user.userId))).returning({ id: trades.id });
  if (!deleted.length) return Response.json({ error: "Trade not found." }, { status: 404 });
  return Response.json({ ok: true });
}
