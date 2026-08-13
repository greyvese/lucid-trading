import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  ticker: text("ticker").notNull(),
  side: text("side").notNull(),
  entry: real("entry").notNull(),
  exit: real("exit"),
  stop: real("stop").notNull(),
  target: real("target").notNull(),
  size: real("size").notNull(),
  leverage: real("leverage").notNull(),
  pnl: real("pnl").notNull(),
  ratio: real("ratio").notNull(),
  strategy: text("strategy").notNull(),
  status: text("status").notNull(),
});
