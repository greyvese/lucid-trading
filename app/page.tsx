"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Trade = {
  id: number;
  date: string;
  ticker: string;
  side: "Long" | "Short";
  entry: number;
  exit: number | null;
  stop: number;
  target: number;
  size: number;
  leverage: number;
  pnl: number;
  ratio: number;
  strategy: string;
  status: "Win" | "Loss" | "Open";
};

type SignedInUser = {
  displayName: string;
  email: string;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function localIsoDate(date = new Date()) {
  return isoDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTradeDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${monthNames[month - 1].slice(0, 3)} ${day}, ${year}`;
}

function formatHeaderDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  return `${value.toLocaleDateString("en-US", { weekday: "long" })} · ${monthNames[month - 1]} ${day}`;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatPrice(value: number) {
  if (value < 10) return value.toFixed(4);
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default function Home() {
  const initialToday = localIsoDate();
  const initialYear = Number(initialToday.slice(0, 4));
  const initialMonth = Number(initialToday.slice(5, 7)) - 1;
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesReady, setTradesReady] = useState(false);
  const [today, setToday] = useState(initialToday);
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [calendarYear, setCalendarYear] = useState(initialYear);
  const [calendarMonth, setCalendarMonth] = useState(initialMonth);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [user, setUser] = useState<SignedInUser | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    ticker: "",
    side: "Long" as "Long" | "Short",
    entry: "",
    exit: "",
    stop: "",
    target: "",
    size: "",
    leverage: "1",
    strategy: "Opening range",
    date: initialToday,
  });

  const liveRatio = useMemo(() => {
    const entry = Number(form.entry);
    const stop = Number(form.stop);
    const target = Number(form.target);
    const risk = Math.abs(entry - stop);
    if (!entry || !stop || !target || !risk) return "—";
    return (Math.abs(target - entry) / risk).toFixed(2);
  }, [form.entry, form.stop, form.target]);

  const livePnl = useMemo(() => {
    const entry = Number(form.entry);
    const exit = Number(form.exit);
    const size = Number(form.size);
    const leverage = Number(form.leverage);
    if (!entry || !exit || !size || !leverage) return 0;
    const priceMove = form.side === "Long" ? (exit - entry) / entry : (entry - exit) / entry;
    return size * leverage * priceMove;
  }, [form.entry, form.exit, form.size, form.leverage, form.side]);

  const selectedPnl = trades
    .filter((trade) => trade.date === selectedDate)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const closedTrades = trades.filter((trade) => trade.status !== "Open");
  const wins = closedTrades.filter((trade) => trade.status === "Win").length;
  const losses = closedTrades.filter((trade) => trade.status === "Loss").length;
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : null;
  const averageRatio = closedTrades.length ? closedTrades.reduce((sum, trade) => sum + trade.ratio, 0) / closedTrades.length : null;
  const consistency = trades.length ? Math.round((trades.filter((trade) => trade.pnl >= 0).length / trades.length) * 100) : null;
  const currentMonthPrefix = today.slice(0, 7);
  const monthPnl = trades.filter((trade) => trade.date.startsWith(currentMonthPrefix)).reduce((sum, trade) => sum + trade.pnl, 0);

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const selectedDayNumber = Number(selectedDate.slice(-2));
  const todayMonth = Number(today.slice(5, 7)) - 1;
  const calendarYears = Array.from({ length: 11 }, (_, index) => calendarYear - 5 + index);

  useEffect(() => {
    const syncToday = () => setToday(localIsoDate());
    syncToday();
    const timer = window.setInterval(syncToday, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      setTrades([]);
      setTradesReady(true);
      return;
    }

    let active = true;
    setTradesReady(false);
    fetch("/api/trades")
      .then(async (response) => ({ response, payload: await response.json() as { trades?: Trade[]; error?: string } }))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error ?? "Unable to load your journal.");
        if (active) setTrades(payload.trades ?? []);
      })
      .catch((error: Error) => active && setNotice(error.message))
      .finally(() => active && setTradesReady(true));
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const [year, month] = today.split("-").map(Number);
    setSelectedDate(today);
    setCalendarYear(year);
    setCalendarMonth(month - 1);
    setForm((current) => ({ ...current, date: today }));
  }, [today]);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((payload: { user: SignedInUser | null }) => setUser(payload.user))
      .catch(() => setUser(null));
  }, []);

  const userInitials = user?.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ME";

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openNewTrade() {
    if (!user) {
      window.location.href = "/signin-with-chatgpt?return_to=%2F";
      return;
    }
    setEditingId(null);
    setForm({
      ticker: "", side: "Long", entry: "", exit: "", stop: "", target: "",
      size: "", leverage: "1", strategy: "Opening range", date: selectedDate,
    });
    setIsFormOpen(true);
  }

  function openEditTrade(trade: Trade) {
    setEditingId(trade.id);
    setForm({
      ticker: trade.ticker,
      side: trade.side,
      entry: String(trade.entry),
      exit: trade.exit === null ? "" : String(trade.exit),
      stop: String(trade.stop),
      target: String(trade.target),
      size: String(trade.size),
      leverage: String(trade.leverage),
      strategy: trade.strategy,
      date: String(trade.date),
    });
    setIsFormOpen(true);
  }

  async function deleteTrade(trade: Trade) {
    if (!window.confirm(`Delete ${trade.ticker} from your journal?`)) return;
    const response = await fetch(`/api/trades/${trade.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json() as { error?: string };
      setNotice(payload.error ?? "Unable to delete this trade.");
      return;
    }
    setTrades((current) => current.filter((item) => item.id !== trade.id));
    setNotice(`${trade.ticker} deleted from your journal`);
    setTimeout(() => setNotice(""), 3200);
  }

  function changeCalendarMonth(delta: number) {
    const next = new Date(calendarYear, calendarMonth + delta, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth();
    setCalendarYear(nextYear);
    setCalendarMonth(nextMonth);
    setSelectedDate(isoDate(nextYear, nextMonth, 1));
  }

  function chooseCalendarMonth(month: number) {
    setCalendarMonth(month);
    setSelectedDate(isoDate(calendarYear, month, 1));
  }

  function chooseCalendarYear(year: number) {
    setCalendarYear(year);
    setSelectedDate(isoDate(year, calendarMonth, 1));
  }

  function selectCalendarDate(date: string) {
    setSelectedDate(date);
    setShowAllTrades(true);
    requestAnimationFrame(() => document.getElementById("journal")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = Number(form.entry);
    const stop = Number(form.stop);
    const target = Number(form.target);
    const exit = form.exit ? Number(form.exit) : null;
    const ratio = Math.abs(target - entry) / Math.abs(entry - stop);
    const savedTrade: Trade = {
      id: editingId ?? Date.now(),
      date: form.date,
      ticker: form.ticker.trim().toUpperCase(),
      side: form.side,
      entry,
      exit,
      stop,
      target,
      size: Number(form.size),
      leverage: Number(form.leverage),
      pnl: livePnl,
      ratio: Number.isFinite(ratio) ? ratio : 0,
      strategy: form.strategy,
      status: !exit ? "Open" : livePnl >= 0 ? "Win" : "Loss",
    };
    const response = await fetch(editingId === null ? "/api/trades" : `/api/trades/${editingId}`, {
      method: editingId === null ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savedTrade),
    });
    const payload = await response.json() as { trade?: Trade; error?: string };
    if (!response.ok || !payload.trade) {
      setNotice(payload.error ?? "Unable to save this trade.");
      return;
    }
    const storedTrade = payload.trade;
    setTrades((current) => editingId === null
      ? [storedTrade, ...current]
      : current.map((trade) => trade.id === editingId ? storedTrade : trade));
    setSelectedDate(storedTrade.date);
    const [savedYear, savedMonth] = storedTrade.date.split("-").map(Number);
    setCalendarYear(savedYear);
    setCalendarMonth(savedMonth - 1);
    setIsFormOpen(false);
    setNotice(editingId === null
      ? `${storedTrade.ticker} added to ${formatTradeDate(storedTrade.date)}`
      : `${storedTrade.ticker} position updated`);
    setTimeout(() => setNotice(""), 3200);
    setEditingId(null);
    setForm((current) => ({ ...current, ticker: "", entry: "", exit: "", stop: "", target: "", size: "", leverage: "1" }));
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar glass">
        <div className="brand" aria-label="Lucid Journal home">
          <span className="brand-mark"><i /><i /></span>
          <span>Lucid</span>
        </div>

        <nav className="nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span>⌂</span>Overview</a>
          <a className="nav-item" href="#journal"><span>↗</span>Journal</a>
          <a className="nav-item" href="#calendar"><span>□</span>Calendar</a>
          <a className="nav-item" href="#insights"><span>⌁</span>Insights</a>
        </nav>

        <div className="focus-card">
          <span className="eyebrow">Weekly focus</span>
          <p>Wait for confirmation. Protect the downside.</p>
          <div className="focus-progress"><span /></div>
          <small>4 of 5 rules followed</small>
        </div>

        {user === undefined ? (
          <div className="profile profile-loading"><span className="avatar">··</span><span><strong>Checking account</strong><small>One moment</small></span></div>
        ) : user ? (
          <div className="profile"><span className="avatar">{userInitials}</span><span><strong>{user.displayName}</strong><small>{user.email}</small></span><b>✓</b></div>
        ) : (
          <a className="profile profile-auth" href="/signin-with-chatgpt?return_to=%2F"><span className="avatar">↗</span><span><strong>Sign up / Sign in</strong><small>Sync your journal</small></span><b>›</b></a>
        )}
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">{formatHeaderDate(today)}</span>
            <h1>Trade with clarity.</h1>
          </div>
          <div className="top-actions">
            <a className="account-button glass" href={user ? "/signout-with-chatgpt?return_to=%2F" : "/signin-with-chatgpt?return_to=%2F"}>{user ? "Sign out" : "Sign in / Sign up"}</a>
            <button className="primary-button" type="button" onClick={openNewTrade}><span>＋</span>Log trade</button>
          </div>
        </header>

        <section className="summary-grid anchor-section" id="overview" aria-label="Trading summary">
          <article className="hero-card glass">
            <div className="hero-copy">
              <span className="eyebrow">{monthNames[todayMonth]} performance</span>
              <p className="hero-value">{monthPnl >= 0 ? "+" : "−"}{money.format(Math.abs(monthPnl))}</p>
              <div className="gain-pill">{trades.length ? `${trades.length} trade${trades.length === 1 ? "" : "s"} recorded` : "Your journal starts here"}</div>
            </div>
            <div className="orb" aria-hidden="true"><span /></div>
            <p className="hero-note">{trades.length ? "Your performance updates automatically as you log each position." : "Log your first position to begin building your trading history."}</p>
          </article>

          <article className="stat-card glass">
            <span className="eyebrow">Win rate</span>
            <strong>{winRate === null ? "—" : `${winRate}%`}</strong>
            <small><b>{wins} wins</b> · {losses} losses</small>
          </article>
          <article className="stat-card glass">
            <span className="eyebrow">Avg. R:R</span>
            <strong>{averageRatio === null ? "—" : averageRatio.toFixed(2)}</strong>
            <small><b>Based on {closedTrades.length}</b> closed trades</small>
          </article>
          <article className="stat-card glass">
            <span className="eyebrow">Consistency</span>
            <strong>{consistency === null ? "—" : consistency}</strong>
            <small><b>{consistency === null ? "Start logging" : "Positive"}</b> trade consistency</small>
          </article>
        </section>

        <section className="workspace-grid">
          <article className="calendar-card glass anchor-section" id="calendar">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Trading calendar</span>
                <div className="calendar-selectors">
                  <select aria-label="Calendar month" value={calendarMonth} onChange={(event) => chooseCalendarMonth(Number(event.target.value))}>{monthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}</select>
                  <select aria-label="Calendar year" value={calendarYear} onChange={(event) => chooseCalendarYear(Number(event.target.value))}>{calendarYears.map((year) => <option key={year}>{year}</option>)}</select>
                </div>
              </div>
              <div className="month-controls"><button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Previous month">‹</button><button type="button" onClick={() => changeCalendarMonth(1)} aria-label="Next month">›</button></div>
            </div>
            <div className="weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">
              {Array.from({ length: firstWeekday }, (_, index) => <span className="empty-day" key={`empty-${index}`} />)}
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                const date = isoDate(calendarYear, calendarMonth, day);
                const dayTrades = trades.filter((trade) => trade.date === date);
                const pnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
                const isActive = date === selectedDate;
                return (
                  <button className={`calendar-day ${isActive ? "selected" : ""} ${pnl > 0 ? "positive" : pnl < 0 ? "negative" : ""}`} key={date} type="button" onClick={() => selectCalendarDate(date)} aria-label={`${monthNames[calendarMonth]} ${day}, ${calendarYear}${pnl ? `, ${money.format(pnl)}` : ""}`}>
                    <span>{day}</span>{pnl !== 0 && <small>{pnl > 0 ? "+" : "−"}${Math.abs(pnl)}</small>}
                  </button>
                );
              })}
            </div>
            <div className="calendar-footer">
              <div><span className="day-badge">{selectedDayNumber}</span><p><strong>{formatTradeDate(selectedDate)}</strong><small>{selectedPnl === 0 ? "No closed P&L" : `${money.format(selectedPnl)} net result`}</small></p></div>
              <span className={selectedPnl >= 0 ? "positive-total" : "negative-total"}>{selectedPnl >= 0 ? "+" : ""}{money.format(selectedPnl)}</span>
            </div>
          </article>

          <aside className="insight-card glass anchor-section" id="insights">
            <div className="section-heading"><div><span className="eyebrow">AI reflection</span><h2>Your edge, distilled.</h2></div><span className="spark">✦</span></div>
            <div className="quote-mark">“</div>
            <blockquote>Your opening-range setups are producing <b>41% more</b> than other strategies this month.</blockquote>
            <div className="insight-chart" aria-label="Opening range performance increased from 54 to 83 percent">
              <i style={{ height: "34%" }} /><i style={{ height: "49%" }} /><i style={{ height: "43%" }} /><i style={{ height: "66%" }} /><i style={{ height: "81%" }} /><i style={{ height: "92%" }} />
            </div>
            <div className="insight-footer"><span>Keep size consistent</span><strong>83% confidence</strong></div>
          </aside>
        </section>

        <section className="trades-card glass anchor-section" id="journal">
          <div className="section-heading trade-heading">
            <div><span className="eyebrow">Trade journal</span><h2>Recent positions <em className="selected-date-chip">{formatTradeDate(selectedDate)}</em></h2></div>
            <button className="text-button" type="button" onClick={() => setShowAllTrades((current) => !current)}>{showAllTrades ? "Show recent" : "View all"} <span>{showAllTrades ? "↑" : "↗"}</span></button>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Ticker</th><th>Entry</th><th>Size</th><th>Leverage</th><th>Stop loss</th><th>Take profit</th><th>Result</th><th>Ratio</th><th>Strategy</th><th /></tr></thead>
              <tbody>
                {!tradesReady && <tr><td colSpan={10}>Loading your journal…</td></tr>}
                {tradesReady && trades.length === 0 && <tr><td colSpan={10}>{user ? "Your journal is ready for your first trade." : "Sign in to create and save your journal."}</td></tr>}
                {(showAllTrades ? trades : trades.slice(0, 5)).map((trade) => (
                  <tr className={trade.date === selectedDate ? "selected-trade-row" : ""} key={trade.id}>
                    <td><span className="ticker-icon">{trade.ticker.slice(0, 1)}</span><span><strong>{trade.ticker}</strong><small>{trade.side} · {formatTradeDate(trade.date)}</small></span></td>
                    <td>{formatPrice(trade.entry)}</td><td>{money.format(trade.size)}</td><td><b>{trade.leverage}×</b></td><td>{formatPrice(trade.stop)}</td><td>{formatPrice(trade.target)}</td>
                    <td><span className={`result ${trade.status.toLowerCase()}`}>{trade.status === "Open" ? "Open" : `${trade.pnl > 0 ? "+" : "−"}${money.format(Math.abs(trade.pnl))}`}</span></td>
                    <td><b>1 : {trade.ratio.toFixed(2)}</b></td><td><span className="strategy-chip">{trade.strategy}</span></td>
                    <td><div className="row-actions"><button type="button" onClick={() => openEditTrade(trade)}>Edit</button><button className="delete-action" type="button" onClick={() => deleteTrade(trade)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => { setIsFormOpen(false); setEditingId(null); }}>
          <section className="trade-modal glass" role="dialog" aria-modal="true" aria-labelledby="trade-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">{editingId === null ? "New position" : "Journal update"}</span><h2 id="trade-modal-title">{editingId === null ? "Log your trade" : "Edit position"}</h2></div><button type="button" onClick={() => { setIsFormOpen(false); setEditingId(null); }} aria-label="Close">×</button></div>
            <form onSubmit={submitTrade}>
              <div className="form-grid">
                <label><span>Ticker</span><input required placeholder="NVDA" value={form.ticker} onChange={(event) => updateField("ticker", event.target.value)} /></label>
                <label><span>Direction</span><select value={form.side} onChange={(event) => updateField("side", event.target.value)}><option>Long</option><option>Short</option></select></label>
                <label><span>Entry</span><input required inputMode="decimal" type="number" step="any" placeholder="181.42" value={form.entry} onChange={(event) => updateField("entry", event.target.value)} /></label>
                <label><span>Exit price <small>optional if open</small></span><input inputMode="decimal" type="number" step="any" placeholder="190.10" value={form.exit} onChange={(event) => updateField("exit", event.target.value)} /></label>
                <label><span>Position size (USD)</span><input required min="0.01" inputMode="decimal" type="number" step="any" placeholder="5,000" value={form.size} onChange={(event) => updateField("size", event.target.value)} /></label>
                <label><span>Leverage</span><select value={form.leverage} onChange={(event) => updateField("leverage", event.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="3">3×</option><option value="5">5×</option><option value="10">10×</option><option value="20">20×</option><option value="50">50×</option><option value="100">100×</option></select></label>
                <label><span>Stop loss</span><input required inputMode="decimal" type="number" step="any" placeholder="177.80" value={form.stop} onChange={(event) => updateField("stop", event.target.value)} /></label>
                <label><span>Take profit</span><input required inputMode="decimal" type="number" step="any" placeholder="190.10" value={form.target} onChange={(event) => updateField("target", event.target.value)} /></label>
                <label><span>Risk : reward</span><input readOnly value={liveRatio === "—" ? "—" : `1 : ${liveRatio}`} /></label>
                <label><span>Calculated P&amp;L</span><input className={livePnl > 0 ? "pnl-positive" : livePnl < 0 ? "pnl-negative" : ""} readOnly value={!form.exit ? "Open — add exit to calculate" : `${livePnl >= 0 ? "+" : "−"}${money.format(Math.abs(livePnl))}`} /></label>
                <label><span>Strategy</span><select value={form.strategy} onChange={(event) => updateField("strategy", event.target.value)}><option>Opening range</option><option>Liquidity sweep</option><option>VWAP reclaim</option><option>Break &amp; retest</option><option>Trend pullback</option></select></label>
                <label><span>Trade date</span><input required type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} /></label>
              </div>
              <div className="form-actions"><button className="secondary-button" type="button" onClick={() => { setIsFormOpen(false); setEditingId(null); }}>Cancel</button><button className="primary-button" type="submit">{editingId === null ? "Save trade" : "Update trade"}</button></div>
            </form>
          </section>
        </div>
      )}
      {notice && <div className="toast" role="status">✓ {notice}</div>}
    </main>
  );
}
