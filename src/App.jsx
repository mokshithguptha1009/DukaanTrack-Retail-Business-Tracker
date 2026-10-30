import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  Users,
  Receipt,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Download,
  CalendarDays,
  Printer,
  NotebookPen,
  CalendarClock,
  Landmark,
  Check,
  Pencil,
  X,
  Menu,
  Bell
} from "lucide-react";
import "./App.css";

const API = "https://dukaantrack-retail-business-tracker.onrender.com/api";
function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value || 0);
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function App() {

  const [debtors, setDebtors] = useState([]);
  const [debtorForm, setDebtorForm] = useState({
    phone: "",
    name: "",
    amount: ""
  });
  const [repaymentForm, setRepaymentForm] = useState({});
  const [debtorSearch, setDebtorSearch] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("dukaantrack_token") || "");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [page, setPage] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [notes, setNotes] = useState([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [cheques, setCheques] = useState([]);
  const [bankBalance, setBankBalance] = useState("0");
  const [bankSummary, setBankSummary] = useState(null);
  const [chequeForm, setChequeForm] = useState({
    recipient: "", chequeNumber: "", amount: "", dueDate: "", bankName: "", note: ""
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState({
    type: "sale",
    amount: "",
    paymentMethod: "cash",
    note: ""
  });

  async function loadDebtors() {
    try {
      setDebtors(await apiRequest("/debtors"));
    } catch (err) {
      setError(err.message);
    }
  }

  async function addCredit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      await apiRequest("/debtors", {
        method: "POST",
        body: JSON.stringify({
          ...debtorForm,
          amount: Number(debtorForm.amount)
        })
      });

      setDebtorForm({ phone: "", name: "", amount: "" });
      setMessage("Credit sale recorded successfully.");
      await Promise.all([loadDebtors(), loadData(false)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function recordRepayment(debtor) {
    const amount = Number(repaymentForm[debtor._id]);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid repayment amount.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/debtors/${debtor._id}/repayments`, {
        method: "POST",
        body: JSON.stringify({ amount })
      });

      setRepaymentForm(previous => ({
        ...previous,
        [debtor._id]: ""
      }));

      setMessage("Repayment recorded successfully.");
      await loadDebtors();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadData(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");

    try {
      if (!token) {
        setLoading(false);
        return;
      }

      const authHeaders = { Authorization: `Bearer ${token}` };
      const [dashboardResponse, transactionResponse] = await Promise.all([
        fetch(`${API}/dashboard`, { headers: authHeaders }),
        fetch(`${API}/transactions`, { headers: authHeaders })
      ]);

      if (dashboardResponse.status === 401 || transactionResponse.status === 401) {
        localStorage.removeItem("dukaantrack_token");
        setToken("");
        throw new Error("Your session expired. Please log in again.");
      }
      if (!dashboardResponse.ok || !transactionResponse.ok) {
        throw new Error("Unable to load business data. Check that the backend is running.");
      }

      const dashboardData = await dashboardResponse.json();
      const transactionData = await transactionResponse.json();

      setDashboard(dashboardData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      handleLogout();
      throw new Error("Your session expired. Please log in again.");
    }
    if (!response.ok) throw new Error(result.message || "The request failed.");
    return result;
  }

  async function loadNotes() {
    try { setNotes(await apiRequest("/notes")); }
    catch (err) { setError(err.message); }
  }
  async function loadBankSummary() {
    try {
      const summary = await apiRequest("/bank-balance");
      setBankSummary(summary);
      setBankBalance(String(summary.bankBalance ?? 0));
    } catch (err) {
      setError(err.message);
    }
  }
  async function loadCheques() {
    try {
      const [items, balance] = await Promise.all([
        apiRequest("/cheques"), apiRequest("/bank-balance")
      ]);
      setCheques(items);
      setBankSummary(balance);
      setBankBalance(String(balance.bankBalance ?? 0));
    } catch (err) { setError(err.message); }
  }

  useEffect(() => {
    if (!token) return;

    if (page === "Owner Notepad") {
      loadNotes();
    }

    if (page === "Cheque & Bank Tracker") {
      loadCheques();
    }

    if (page === "Dashboard") {
      loadBankSummary();
    }
  }, [token, page]);

  async function saveNote(event) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const body = JSON.stringify({ title: noteTitle.trim() || "Untitled note", content: noteContent });
      const saved = await apiRequest(editingNoteId ? `/notes/${editingNoteId}` : "/notes", {
        method: editingNoteId ? "PATCH" : "POST", body
      });
      if (editingNoteId) setNotes(previous => previous.map(note => note._id === saved._id ? saved : note));
      else setNotes(previous => [saved, ...previous]);
      setNoteTitle(""); setNoteContent(""); setEditingNoteId("");
      setMessage("Note saved successfully.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  function editNote(note) {
    setEditingNoteId(note._id); setNoteTitle(note.title || ""); setNoteContent(note.content || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleNote(note) {
    try {
      const updated = await apiRequest(`/notes/${note._id}`, {
        method: "PATCH", body: JSON.stringify({ isCompleted: !note.isCompleted })
      });
      setNotes(previous => previous.map(item => item._id === updated._id ? updated : item));
    } catch (err) { setError(err.message); }
  }

  async function deleteNote(id) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await apiRequest(`/notes/${id}`, { method: "DELETE" });
      setNotes(previous => previous.filter(note => note._id !== id));
      setMessage("Note deleted.");
    } catch (err) { setError(err.message); }
  }

  async function saveCheque(event) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const body = JSON.stringify({ ...chequeForm, amount: Number(chequeForm.amount) });
      const created = await apiRequest("/cheques", { method: "POST", body });
      setCheques(previous => [...previous, created].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
      setChequeForm({ recipient: "", chequeNumber: "", amount: "", dueDate: "", bankName: "", note: "" });
      const summary = await apiRequest("/bank-balance"); setBankSummary(summary);
      setMessage("Cheque saved. Bank forecast updated.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function updateChequeStatus(cheque, status) {
    try {
      const updated = await apiRequest(`/cheques/${cheque._id}`, {
        method: "PATCH", body: JSON.stringify({ status })
      });
      setCheques(previous => previous.map(item => item._id === updated._id ? updated : item));
      setBankSummary(await apiRequest("/bank-balance"));
      setMessage(`Cheque marked ${status}.`);
    } catch (err) { setError(err.message); }
  }

  async function deleteCheque(id) {
    if (!window.confirm("Delete this cheque record?")) return;
    try {
      await apiRequest(`/cheques/${id}`, { method: "DELETE" });
      setCheques(previous => previous.filter(item => item._id !== id));
      setBankSummary(await apiRequest("/bank-balance"));
      setMessage("Cheque deleted.");
    } catch (err) { setError(err.message); }
  }

  async function saveBankBalance(event) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await apiRequest("/bank-balance", { method: "PUT", body: JSON.stringify({ amount: Number(bankBalance) }) });
      setBankSummary(await apiRequest("/bank-balance"));
      setMessage("Bank balance saved and forecast recalculated.");
    } catch (err) { setError(err.message); }
  }

  useEffect(() => {
    if (token) loadData();
    else setLoading(false);
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Login failed.");
      localStorage.setItem("dukaantrack_token", result.token);
      setToken(result.token);
      setLoginPassword("");
      setMessage("Login successful.");
    } catch (err) {
      setError(err.message || "Could not log in. Check that the backend is running.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("dukaantrack_token");
    setToken("");
    setDashboard(null);
    setTransactions([]);
    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not save transaction.");
      }

      setForm({
        type: "sale",
        amount: "",
        paymentMethod: "cash",
        note: ""
      });

      setMessage("Transaction saved successfully!");
      await loadData(false);
    } catch (err) {
      setError(err.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id) {
    const confirmed = window.confirm(
      "Delete this transaction permanently? Dashboard totals will be updated."
    );
    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not delete transaction.");
      }

      setMessage("Transaction deleted successfully.");
      await loadData(false);
    } catch (err) {
      setError(err.message || "Could not delete transaction.");
    }
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm(previous => ({
      ...previous,
      [name]: value,
      ...(name === "type" && value === "expense" && previous.paymentMethod === "credit"
        ? { paymentMethod: "cash" }
        : {})
    }));
  }

  function exportTransactions(items) {
    setError("");
    setMessage("");

    if (items.length === 0) {
      setError("There are no transactions to export.");
      return;
    }

    const headers = ["Type", "Description", "Payment Method", "Date", "Amount"];
    const escapeCSV = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = items.map(item => [
      item.type,
      item.note || "",
      item.paymentMethod,
      new Date(item.date).toLocaleDateString("en-IN"),
      item.amount
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dukaantrack-transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage("CSV file downloaded successfully!");
  }

  const today = dashboard?.today;
  const month = dashboard?.month;

  const filteredTransactions = transactions.filter(item => {
    const searchText = search.toLowerCase();
    const searchMatch =
      (item.note || "").toLowerCase().includes(searchText) ||
      item.paymentMethod.toLowerCase().includes(searchText) ||
      item.type.toLowerCase().includes(searchText);
    const typeMatch = typeFilter === "all" || item.type === typeFilter;
    const paymentMatch = paymentFilter === "all" || item.paymentMethod === paymentFilter;
    return searchMatch && typeMatch && paymentMatch;
  });

  const reportTransactions = transactions.filter(item => {
    const itemDate = dateKey(item.date);
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  });

  const reportSummary = reportTransactions.reduce((summary, item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === "sale") {
      summary.sales += amount;
      if (item.paymentMethod === "credit") {
        summary.creditSales += amount;
      } else {
        summary.collected += amount;
      }
    } else if (item.type === "expense") {
      summary.expenses += amount;
    }
    return summary;
  }, { sales: 0, collected: 0, creditSales: 0, expenses: 0 });

  // Prepare a simple chart for the last seven days.
  const weeklyChartData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const key = dateKey(day);
    const dayTransactions = transactions.filter(item => dateKey(item.date) === key);

    return {
      key,
      label: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      sales: dayTransactions
        .filter(item => item.type === "sale")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      expenses: dayTransactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    };
  });

  const chartMaximum = Math.max(
    1,
    ...weeklyChartData.flatMap(day => [day.sales, day.expenses])
  );

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Sales & Expenses", icon: ShoppingBag },
    { name: "Debtor Tracker", icon: Users },
    { name: "Reports", icon: Receipt },
    { name: "Owner Notepad", icon: NotebookPen },
    { name: "Cheque & Bank Tracker", icon: Landmark }
  ];

  const cards = [
    {
      title: "Today's Sales",
      value: money(today?.sales),
      icon: ShoppingBag,
      description: "All sales, including credit"
    },
    {
      title: "Payments Collected",
      value: money(today?.collected),
      icon: Wallet,
      description: "Non-credit sales received"
    },
    {
      title: "Credit Sales",
      value: money(today?.creditSales),
      icon: Users,
      description: "New credit given today"
    },
    {
      title: "Today's Expenses",
      value: money(today?.expenses),
      icon: Receipt,
      description: "Recorded expenses"
    }
  ];

  function TransactionTable({ items }) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id}>
                <td>
                  <span className={`type-badge ${item.type}`}>{item.type}</span>
                </td>
                <td>{item.note || "No description"}</td>
                <td>{item.paymentMethod.toUpperCase()}</td>
                <td>{new Date(item.date).toLocaleDateString("en-IN")}</td>
                <td className="amount">{money(item.amount)}</td>
                <td>
                  <button
                    type="button"
                    className="delete-button"
                    title="Delete transaction"
                    onClick={() => deleteTransaction(item._id)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="empty">No transactions match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f7fb", padding: 20, fontFamily: "inherit" }}>
        <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 420, boxSizing: "border-box", background: "white", padding: 32, borderRadius: 18, border: "1px solid #e1e8f0", boxShadow: "0 12px 35px rgba(20, 45, 80, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#e7f6ef", color: "#07865b", display: "grid", placeItems: "center" }}><ShoppingBag size={26} /></div>
            <div><h1 style={{ margin: 0, fontSize: 25, color: "#172b4d" }}>DukaanTrack</h1><p style={{ margin: "5px 0 0", color: "#64748b" }}>Owner login · Retail management</p></div>
          </div>
          <h2 style={{ margin: "0 0 8px", color: "#172b4d" }}>Welcome back</h2>
          <p style={{ margin: "0 0 22px", color: "#64748b", fontSize: 14 }}>Log in to manage your shop's business records.</p>
          {error && <div style={{ background: "#fff0f0", color: "#b42318", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          <label style={{ display: "block", marginBottom: 7, fontWeight: 600, color: "#334155" }}>Username</label>
          <input value={loginUsername} onChange={event => setLoginUsername(event.target.value)} autoComplete="username" required style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 16, fontSize: 15 }} />
          <label style={{ display: "block", marginBottom: 7, fontWeight: 600, color: "#334155" }}>Password</label>
          <input type="password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} autoComplete="current-password" required style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 20, fontSize: 15 }} />
          <button type="submit" disabled={loginLoading} style={{ width: "100%", border: 0, borderRadius: 9, padding: 13, background: "#07865b", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{loginLoading ? "Logging in..." : "Log in securely"}</button>
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, margin: "18px 0 0" }}>Your owner credentials are configured in the server .env file.</p>
        </form>
      </div>
    );
  }

  return (
    <div className={`app page-${page.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><ShoppingBag size={23} /></div>
          <div>
            <h2>DukaanTrack</h2>
            <span>Retail management</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.name}
              className={`nav-item ${page === item.name ? "active" : ""}`}
              onClick={() => {
                setPage(item.name);
                setError("");
                setMessage("");
              }}
            >
              <Icon size={19} />
              {item.name}
            </button>
          );
        })}

        <div className="sidebar-bottom">
          <div className="status-dot" />
          Local development
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR BUSINESS AT A GLANCE</p>
            <h1>{page}</h1>
            <p className="muted">
              {page === "Dashboard" && "Track your daily business performance."}
              {page === "Sales & Expenses" && "Search, filter and manage your saved transactions."}

              {page === "Debtor Tracker" && (
                <>
                  <section className="content-grid">
                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Record credit sale</h2>
                          <p className="muted">
                            Phone number identifies each debtor.
                          </p>
                        </div>
                        <Users size={22} />
                      </div>

                      <form onSubmit={addCredit}>
                        <label>Customer phone number</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          value={debtorForm.phone}
                          onChange={e => setDebtorForm({
                            ...debtorForm,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10)
                          })}
                          placeholder="10-digit phone number"
                          required
                        />

                        <label>Customer name (optional)</label>
                        <input
                          value={debtorForm.name}
                          onChange={e => setDebtorForm({
                            ...debtorForm,
                            name: e.target.value
                          })}
                          placeholder="Customer name"
                        />

                        <label>Credit amount (₹)</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={debtorForm.amount}
                          onChange={e => setDebtorForm({
                            ...debtorForm,
                            amount: e.target.value
                          })}
                          placeholder="Enter amount"
                          required
                        />

                        <button
                          type="submit"
                          className="primary-button"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Record credit sale"}
                        </button>
                      </form>
                    </div>

                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Outstanding summary</h2>
                          <p className="muted">Based on saved debtor records</p>
                        </div>
                        <Wallet size={22} />
                      </div>

                      <div className="summary-row">
                        <span>Total debtors</span>
                        <strong>{debtors.length}</strong>
                      </div>

                      <div className="summary-row">
                        <span>Total credit given</span>
                        <strong>
                          {money(debtors.reduce((sum, d) =>
                            sum + Number(d.totalCredit || 0), 0
                          ))}
                        </strong>
                      </div>

                      <div className="summary-row">
                        <span>Total repayments</span>
                        <strong>
                          {money(debtors.reduce((sum, d) =>
                            sum + Number(d.totalPaid || 0), 0
                          ))}
                        </strong>
                      </div>

                      <div className="summary-row total-row">
                        <span>Total outstanding</span>
                        <strong>
                          {money(debtors.reduce((sum, d) =>
                            sum + Number(d.outstanding || 0), 0
                          ))}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="panel transactions-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Debtor records</h2>
                        <p className="muted">
                          Search customers and record repayments.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={loadDebtors}
                      >
                        <RefreshCw size={16} /> Refresh
                      </button>
                    </div>

                    <div className="search-box">
                      <Search size={18} />
                      <input
                        value={debtorSearch}
                        onChange={e => setDebtorSearch(e.target.value)}
                        placeholder="Search by phone number or name"
                      />
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Credit</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Record repayment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debtors
                            .filter(d =>
                              `${d.phone} ${d.name || ""}`
                                .toLowerCase()
                                .includes(debtorSearch.toLowerCase())
                            )
                            .map(d => (
                              <tr key={d._id}>
                                <td>{d.name || "Customer"}</td>
                                <td>{d.phone}</td>
                                <td>{money(d.totalCredit)}</td>
                                <td>{money(d.totalPaid)}</td>
                                <td className="amount">
                                  {money(d.outstanding)}
                                </td>
                                <td>
                                  {d.outstanding > 0 ? (
                                    <div style={{
                                      display: "flex",
                                      gap: 6,
                                      minWidth: 190
                                    }}>
                                      <input
                                        type="number"
                                        min="0.01"
                                        max={d.outstanding}
                                        step="0.01"
                                        placeholder="₹ Amount"
                                        value={repaymentForm[d._id] || ""}
                                        onChange={e => setRepaymentForm(
                                          previous => ({
                                            ...previous,
                                            [d._id]: e.target.value
                                          })
                                        )}
                                      />
                                      <button
                                        type="button"
                                        className="primary-button"
                                        onClick={() => recordRepayment(d)}
                                      >
                                        <Check size={15} /> Paid
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="type-badge sale">
                                      Settled
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}

                          {debtors.filter(d =>
                            `${d.phone} ${d.name || ""}`
                              .toLowerCase()
                              .includes(debtorSearch.toLowerCase())
                          ).length === 0 && (
                              <tr>
                                <td colSpan="6" className="empty">
                                  No debtors found. Record your first credit sale.
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
              {page === "Reports" && "Review your business transaction records."}
              {page === "Owner Notepad" && "Save shop reminders, tasks and private business notes."}
              {page === "Cheque & Bank Tracker" && "Track upcoming cheque payments and estimate your available bank balance."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className="secondary-button menu-toggle"
              onClick={() => setSidebarCollapsed(previous => !previous)}
              aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
              title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              className="secondary-button reminder-button"
              onClick={() => setPage("Cheque & Bank Tracker")}
              title="View cheque reminders"
              aria-label={`View cheque reminders. ${bankSummary?.dueSoonCount || 0} upcoming`}
            >
              <Bell size={18} />
              <span>Due: {bankSummary?.dueSoonCount || 0}</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadData()}
              disabled={loading}
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {message && <div className="success-message">{message}</div>}


        {page === "Dashboard" && (
          <>
            {/* WELCOME AND SIMPLE DAILY SUMMARY */}
            <section className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">YOUR SHOP TODAY</p>
                  <h2 style={{ marginBottom: 6 }}>Welcome to your shop overview!</h2>
                  <p className="muted">
                    Here is what happened in your shop today, using the records you saved.
                  </p>
                </div>
                <ShoppingBag size={28} />
              </div>

              <p style={{ margin: 0, lineHeight: 1.7 }}>
                <strong>Remember:</strong> Sales means goods sold.
                Money collected means payments received.
                Credit means customers still need to pay you.
                These amounts are different, so check each one separately.
              </p>
            </section>

            {/* TODAY'S MONEY */}
            <section className="section-heading">
              <div>
                <h2>Today's money summary</h2>
                <p className="muted">
                  Big numbers, simple meanings
                </p>
              </div>
            </section>

            {/* DUKAANTRACK BUSINESS HEALTH SCORE */}
            {(() => {
              const weekSales = weeklyChartData.reduce(
                (sum, day) => sum + day.sales, 0
              );
              const weekExpenses = weeklyChartData.reduce(
                (sum, day) => sum + day.expenses, 0
              );
              const activeDays = weeklyChartData.filter(
                day => day.sales > 0 || day.expenses > 0
              ).length;

              const totalCredit = debtors.reduce(
                (sum, d) => sum + Number(d.totalCredit || 0), 0
              );
              const totalPaid = debtors.reduce(
                (sum, d) => sum + Number(d.totalPaid || 0), 0
              );
              const outstanding = debtors.reduce(
                (sum, d) => sum + Number(d.outstanding || 0), 0
              );

              const forecast = bankSummary?.estimatedBalanceAfterSevenDays;
              const overdue = Number(bankSummary?.overdueCount || 0);

              const cashPoints = forecast === undefined
                ? 15
                : Number(forecast) < 0
                  ? 0
                  : overdue > 0
                    ? 15
                    : 30;

              const creditPoints = totalCredit > 0
                ? Math.round(25 * Math.max(
                  0,
                  Math.min(1, totalPaid / totalCredit)
                ))
                : 18;

              const performancePoints = weekSales + weekExpenses === 0
                ? 12
                : weekSales > weekExpenses
                  ? 25
                  : weekSales === weekExpenses
                    ? 15
                    : 5;

              const recordPoints = Math.round((activeDays / 7) * 20);

              const score = Math.min(
                100,
                cashPoints + creditPoints + performancePoints + recordPoints
              );

              const scoreColor = score >= 75
                ? "#16a34a"
                : score >= 50
                  ? "#d97706"
                  : "#dc2626";

              const scoreLabel = score >= 75
                ? "Good business health"
                : score >= 50
                  ? "Needs some attention"
                  : "Needs urgent attention";

              const reasons = [
                {
                  title: "Bank & cheque safety",
                  points: cashPoints,
                  max: 30,
                  detail: forecast === undefined
                    ? "Bank forecast is not available yet."
                    : Number(forecast) < 0
                      ? "Upcoming cheques may exceed your bank balance."
                      : overdue > 0
                        ? `${overdue} overdue cheque(s) need review.`
                        : "No negative 7-day bank forecast or overdue cheques detected."
                },
                {
                  title: "Customer repayment",
                  points: creditPoints,
                  max: 25,
                  detail: totalCredit > 0
                    ? `${money(totalPaid)} repaid against ${money(totalCredit)} in recorded credit. Outstanding: ${money(outstanding)}.`
                    : "No credit history recorded yet; a neutral score is used."
                },
                {
                  title: "Sales vs expenses",
                  points: performancePoints,
                  max: 25,
                  detail: weekSales + weekExpenses === 0
                    ? "Record sales and expenses to measure performance."
                    : `Last 7 days: sales ${money(weekSales)}, expenses ${money(weekExpenses)}.`
                },
                {
                  title: "Record keeping",
                  points: recordPoints,
                  max: 20,
                  detail: `${activeDays} of the last 7 days have recorded sales or expenses.`
                }
              ];

              return (
                <section className="panel" style={{ marginBottom: 24 }}>
                  <div className="panel-heading">
                    <div>
                      <h2>Business Health Score</h2>
                      <p className="muted">
                        One simple score to understand how your shop is doing
                      </p>
                    </div>
                    <Wallet size={24} />
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 1fr) minmax(240px, 2fr)",
                    gap: 24,
                    alignItems: "center"
                  }}>
                    <div style={{ textAlign: "center", padding: 12 }}>
                      <div style={{
                        width: 170,
                        height: 170,
                        maxWidth: "100%",
                        aspectRatio: "1",
                        margin: "0 auto 14px",
                        borderRadius: "50%",
                        background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #e5e7eb 0deg)`,
                        display: "grid",
                        placeItems: "center"
                      }}>
                        <div style={{
                          width: "78%",
                          height: "78%",
                          borderRadius: "50%",
                          background: "var(--panel-bg, white)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <strong style={{
                            fontSize: 42,
                            lineHeight: 1.1,
                            color: scoreColor
                          }}>
                            {score}
                          </strong>
                          <span className="muted">out of 100</span>
                        </div>
                      </div>

                      <h3 style={{ color: scoreColor, margin: "0 0 8px" }}>
                        {scoreLabel}
                      </h3>
                      <p className="muted" style={{ fontSize: 13 }}>
                        Based on your currently available records
                      </p>
                    </div>

                    <div>
                      <h3 style={{ marginTop: 0 }}>
                        Why did you get this score?
                      </h3>

                      {reasons.map(reason => (
                        <div key={reason.title} style={{ marginBottom: 18 }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 6
                          }}>
                            <strong>{reason.title}</strong>
                            <strong>
                              {reason.points}/{reason.max}
                            </strong>
                          </div>

                          <div style={{
                            height: 8,
                            background: "#e5e7eb",
                            borderRadius: 20,
                            overflow: "hidden"
                          }}>
                            <div style={{
                              height: "100%",
                              width: `${(reason.points / reason.max) * 100}%`,
                              background: scoreColor,
                              borderRadius: 20
                            }} />
                          </div>

                          <p className="muted" style={{
                            fontSize: 13,
                            margin: "6px 0 0"
                          }}>
                            {reason.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#eff6ff",
                    color: "#1e40af",
                    fontSize: 13,
                    marginTop: 10
                  }}>
                    <strong>What does this mean?</strong>
                    {" "}A higher score means the recorded indicators look healthier.
                    Improve it by keeping records updated, following up on customer
                    repayments and preparing for upcoming cheques.
                  </div>

                  <p className="note">
                    This is DukaanTrack's own rule-based business indicator, not a
                    CIBIL score, credit rating or prediction of loan approval.
                    It uses the last 7 days of loaded transactions and may be less
                    reliable when records are incomplete. The score is an initial
                    prototype and should not be used for lending decisions.
                  </p>
                </section>
              );
            })()}

            <section className="metrics-grid">
              {cards.map(card => {
                const Icon = card.icon;
                const descriptions = {
                  "Today's Sales":
                    "Total value of goods sold today, including credit sales.",
                  "Payments Collected":
                    "Money received for sales today. Credit sales are not included.",
                  "Credit Sales":
                    "Sales recorded as credit. This money may not have been received yet.",
                  "Today's Expenses":
                    "Money spent on expenses that you recorded today."
                };

                return (
                  <div className="metric-card" key={card.title}>
                    <div className="metric-top">
                      <span>{card.title}</span>
                      <div className="metric-icon">
                        <Icon size={22} />
                      </div>
                    </div>

                    <h3 style={{ fontSize: 26 }}>
                      {loading ? "Loading..." : card.value}
                    </h3>

                    <p style={{ lineHeight: 1.6 }}>
                      {descriptions[card.title] || card.description}
                    </p>
                  </div>
                );
              })}
            </section>

            {/* PLAIN-LANGUAGE DAILY INSIGHTS */}
            <section className="panel" style={{ marginTop: 20 }}>
              <div className="panel-heading">
                <div>
                  <h2>What do these numbers mean?</h2>
                  <p className="muted">
                    A simple explanation of today's records
                  </p>
                </div>
                <FileText size={23} />
              </div>

              {loading ? (
                <p>Checking your shop records...</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0"
                  }}>
                    <strong>Money from sales</strong>
                    <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                      You recorded {money(today?.sales)} in sales today.
                      This includes sales made on credit, so it does not mean
                      all this money is already in your hand or bank.
                    </p>
                  </div>

                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe"
                  }}>
                    <strong>Money received</strong>
                    <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                      You recorded {money(today?.collected)} in non-credit
                      sales today. Keep this separate from credit sales and
                      repayments.
                    </p>
                  </div>

                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#fffbeb",
                    border: "1px solid #fde68a"
                  }}>
                    <strong>Money spent</strong>
                    <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                      You recorded {money(today?.expenses)} in expenses today.
                      Recording every expense helps you understand where your
                      money is going.
                    </p>
                  </div>

                  {Number(today?.creditSales || 0) > 0 && (
                    <div style={{
                      padding: 14,
                      borderRadius: 10,
                      background: "#fff7ed",
                      border: "1px solid #fed7aa"
                    }}>
                      <strong>Credit needs attention</strong>
                      <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                        You recorded {money(today?.creditSales)} in new credit
                        sales today. Check the Customer Credit section to
                        track what customers still owe.
                      </p>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ marginTop: 10 }}
                        onClick={() => setPage("Debtor Tracker")}
                      >
                        View customer credit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* BANK AND CHEQUE SAFETY */}
            <section className="section-heading" style={{ marginTop: 24 }}>
              <div>
                <h2>Will I have enough money for upcoming cheques?</h2>
                <p className="muted">
                  Check your bank balance before payments are due.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage("Cheque & Bank Tracker")}
              >
                <CalendarClock size={17} />
                Manage cheques
              </button>
            </section>

            <section className="report-grid">
              <div className="metric-card">
                <div className="metric-top">
                  Current bank balance
                  <Landmark size={21} />
                </div>
                <h3>{money(bankSummary?.bankBalance)}</h3>
                <p>Balance entered in your bank tracker.</p>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  Cheques due in 7 days
                  <CalendarClock size={21} />
                </div>
                <h3>{money(bankSummary?.dueWithinSevenDays)}</h3>
                <p>
                  {bankSummary?.dueSoonCount || 0} upcoming cheque(s).
                  Keep enough money ready.
                </p>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  Estimated bank balance
                  <Wallet size={21} />
                </div>
                <h3 style={{
                  color: (bankSummary?.estimatedBalanceAfterSevenDays ?? 0) < 0
                    ? "#b42318"
                    : undefined
                }}>
                  {money(bankSummary?.estimatedBalanceAfterSevenDays)}
                </h3>
                <p>
                  Estimated amount left after cheques due in 7 days.
                  This is a forecast, not a guarantee.
                </p>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  Cheques past due
                  <CalendarClock size={21} />
                </div>
                <h3 style={{
                  color: (bankSummary?.overdueCount || 0) > 0
                    ? "#b42318"
                    : undefined
                }}>
                  {bankSummary?.overdueCount || 0}
                </h3>
                <p>Check these payments and update their status.</p>
              </div>
            </section>

            {(bankSummary?.overdueCount > 0 ||
              (bankSummary?.estimatedBalanceAfterSevenDays ?? 0) < 0) && (
                <div className="error" style={{ marginTop: 16 }}>
                  <strong>Please check your bank payments.</strong>
                  <p style={{ margin: "8px 0", lineHeight: 1.6 }}>
                    {bankSummary?.overdueCount > 0 &&
                      `${bankSummary.overdueCount} cheque(s) are past their due date. `}
                    {(bankSummary?.estimatedBalanceAfterSevenDays ?? 0) < 0 &&
                      "Your estimated bank balance may not cover all upcoming cheques."}
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPage("Cheque & Bank Tracker")}
                  >
                    Review cheques now
                  </button>
                </div>
              )}

            {/* LAST SEVEN DAYS CHART */}

            {/* BUSINESS ACTION CENTER */}
            <section className="panel" style={{ marginBottom: 22 }}>
              <div className="panel-heading">
                <div>
                  <h2>Business Action Center</h2>
                  <p className="muted">
                    Important signals and suggested next steps for your shop
                  </p>
                </div>
                <Wallet size={22} />
              </div>

              {(() => {
                const sales = Number(today?.sales || 0);
                const expenses = Number(today?.expenses || 0);
                const credit = Number(today?.creditSales || 0);
                const collected = Number(today?.collected || 0);
                const bankForecast =
                  bankSummary?.estimatedBalanceAfterSevenDays;
                const overdue = Number(bankSummary?.overdueCount || 0);
                const creditPercent =
                  sales > 0 ? (credit / sales) * 100 : 0;
                const remaining = sales - expenses;

                const actions = [];

                if (overdue > 0) {
                  actions.push({
                    level: "Urgent",
                    title: "Review overdue cheques",
                    detail: `${overdue} cheque(s) have passed their due date. Check their status and contact the payees if needed.`,
                    page: "Cheque & Bank Tracker"
                  });
                }

                if (bankForecast !== undefined && Number(bankForecast) < 0) {
                  actions.push({
                    level: "Urgent",
                    title: "Upcoming payments may exceed your bank balance",
                    detail: `Your estimated balance after cheques due within 7 days is ${money(bankForecast)}. Review upcoming payments before spending.`,
                    page: "Cheque & Bank Tracker"
                  });
                }

                if (creditPercent >= 30) {
                  actions.push({
                    level: "Watch",
                    title: "A large share of today's sales is on credit",
                    detail: `${creditPercent.toFixed(1)}% of today's recorded sales is credit. Follow up on outstanding customer payments.`,
                    page: "Debtor Tracker"
                  });
                }

                if (sales > 0 && expenses > sales) {
                  actions.push({
                    level: "Watch",
                    title: "Today's recorded expenses exceed sales",
                    detail: `Expenses are ${money(expenses - sales)} higher than sales today. Review today's entries and spending. This is not a final profit calculation.`,
                    page: "Reports"
                  });
                }

                if (sales > 0 && creditPercent < 30) {
                  actions.push({
                    level: "Good",
                    title: "Most of today's sales are not recorded as credit",
                    detail: `${money(collected)} has been recorded as non-credit sales received today. Continue tracking payments accurately.`,
                    page: "Reports"
                  });
                }

                if (sales === 0) {
                  actions.push({
                    level: "Info",
                    title: "Start by recording today's sales",
                    detail: "Once sales are recorded, DukaanTrack can compare sales, expenses and credit for the day.",
                    page: "Sales & Expenses"
                  });
                }

                if (
                  bankForecast !== undefined &&
                  Number(bankForecast) >= 0 &&
                  overdue === 0
                ) {
                  actions.push({
                    level: "Good",
                    title: "No immediate cheque warning detected",
                    detail: `The recorded 7-day bank forecast is ${money(bankForecast)}. Keep the bank balance and cheque schedule updated.`,
                    page: "Cheque & Bank Tracker"
                  });
                }

                return (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                        marginBottom: 18
                      }}
                    >
                      <div style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0"
                      }}>
                        <p style={{ margin: "0 0 7px", color: "#166534" }}>
                          Today's sales minus expenses
                        </p>
                        <h2 style={{
                          margin: 0,
                          color: remaining < 0 ? "#b42318" : "#166534"
                        }}>
                          {money(remaining)}
                        </h2>
                        <small style={{ color: "#166534" }}>
                          A quick difference, not confirmed profit
                        </small>
                      </div>

                      <div style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe"
                      }}>
                        <p style={{ margin: "0 0 7px", color: "#1d4ed8" }}>
                          Today's credit share
                        </p>
                        <h2 style={{ margin: 0, color: "#1d4ed8" }}>
                          {creditPercent.toFixed(1)}%
                        </h2>
                        <small style={{ color: "#1d4ed8" }}>
                          {money(credit)} of {money(sales)} sales recorded as credit
                        </small>
                      </div>
                    </div>

                    <h3 style={{ marginBottom: 12 }}>What should I do next?</h3>

                    {actions.map((action, index) => (
                      <div
                        key={`${action.title}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 14,
                          flexWrap: "wrap",
                          padding: 14,
                          marginBottom: 10,
                          border: "1px solid #e2e8f0",
                          borderRadius: 10
                        }}
                      >
                        <div style={{ flex: "1 1 240px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 12,
                              fontWeight: 700,
                              marginBottom: 6,
                              color: action.level === "Urgent"
                                ? "#b42318"
                                : action.level === "Watch"
                                  ? "#92400e"
                                  : "#475569"
                            }}
                          >
                            {action.level.toUpperCase()}
                          </span>
                          <h4 style={{ margin: "0 0 5px" }}>
                            {action.title}
                          </h4>
                          <p className="muted" style={{ margin: 0 }}>
                            {action.detail}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setPage(action.page)}
                        >
                          Take action
                        </button>
                      </div>
                    ))}
                  </>
                );
              })()}

              <p className="note" style={{ marginBottom: 0 }}>
                These are rule-based suggestions from recorded data, not AI predictions.
                Results may be incomplete if records are missing. Sales minus expenses
                does not include inventory costs, other liabilities or all accounting adjustments.
              </p>
            </section>

            <section className="panel chart-panel" style={{ marginTop: 24 }}>
              <div className="panel-heading">
                <div>
                  <h2>How has my shop been doing?</h2>
                  <p className="muted">
                    Compare daily sales with recorded expenses over the last 7 days.
                  </p>
                </div>
                <FileText size={23} />
              </div>

              <div className="chart-legend">
                <span><i className="legend-sale" /> Sales</span>
                <span><i className="legend-expense" /> Expenses</span>
              </div>

              <div className="weekly-chart">
                {weeklyChartData.map(day => (
                  <div className="chart-day" key={day.key}>
                    <div className="chart-bars">
                      <div
                        className="chart-bar chart-sale"
                        style={{
                          height: `${Math.max(
                            day.sales > 0 ? 4 : 0,
                            (day.sales / chartMaximum) * 100
                          )}%`
                        }}
                        title={`Sales: ${money(day.sales)}`}
                      />
                      <div
                        className="chart-bar chart-expense"
                        style={{
                          height: `${Math.max(
                            day.expenses > 0 ? 4 : 0,
                            (day.expenses / chartMaximum) * 100
                          )}%`
                        }}
                        title={`Expenses: ${money(day.expenses)}`}
                      />
                    </div>
                    <span className="chart-date">{day.label}</span>
                    <span className="chart-day-total">
                      Sales: {money(day.sales)}
                    </span>
                    <span className="chart-day-total">
                      Spent: {money(day.expenses)}
                    </span>
                  </div>
                ))}
              </div>

              <p className="note">
                Taller sales bars mean higher recorded sales. Taller expense
                bars mean more recorded spending. Missing transactions will
                make the chart incomplete.
              </p>
            </section>

            {/* QUICK ENTRY */}
            <section className="content-grid" style={{ marginTop: 24 }}>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Record money in or out</h2>
                    <p className="muted">
                      Save a sale or an expense in a few steps.
                    </p>
                  </div>
                  <PlusCircle size={23} />
                </div>

                <form onSubmit={handleSubmit}>
                  <label>What are you recording?</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={updateForm}
                  >
                    <option value="sale">Sale — goods sold</option>
                    <option value="expense">Expense — money spent</option>
                  </select>

                  <label>Amount in rupees (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    placeholder="Example: 250"
                    value={form.amount}
                    onChange={updateForm}
                    required
                  />

                  <label>How was it paid?</label>
                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={updateForm}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    {form.type === "sale" && (
                      <option value="credit">Credit — customer will pay later</option>
                    )}
                    <option value="other">Other</option>
                  </select>

                  <label>What was it for? (optional)</label>
                  <input
                    type="text"
                    name="note"
                    placeholder="Example: Rice sale or electricity bill"
                    value={form.note}
                    onChange={updateForm}
                    maxLength={200}
                  />

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save record"}
                  </button>
                </form>
              </div>

              {/* MONTHLY SUMMARY */}
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>This month's summary</h2>
                    <p className="muted">
                      Your saved records for the current month.
                    </p>
                  </div>
                  <LayoutDashboard size={23} />
                </div>

                <div className="summary-row">
                  <span>Goods sold (sales)</span>
                  <strong>{money(month?.sales)}</strong>
                </div>
                <div className="summary-row">
                  <span>Non-credit sales collected</span>
                  <strong>{money(month?.collected)}</strong>
                </div>
                <div className="summary-row">
                  <span>New credit sales</span>
                  <strong>{money(month?.creditSales)}</strong>
                </div>
                <div className="summary-row">
                  <span>Recorded expenses</span>
                  <strong>{money(month?.expenses)}</strong>
                </div>
                <div className="summary-row total-row">
                  <span>Sales minus recorded expenses</span>
                  <strong>
                    {money(
                      Number(month?.sales || 0) -
                      Number(month?.expenses || 0)
                    )}
                  </strong>
                </div>

                <p className="note" style={{ lineHeight: 1.7 }}>
                  This last number is not your actual profit. The cost of
                  buying goods, stock, and other costs may not be included.
                  It is only sales minus the expenses recorded here.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPage("Reports")}
                >
                  View business reports
                </button>
              </div>
            </section>

            {/* RECENT RECORDS */}
            <section className="panel transactions-panel" style={{ marginTop: 24 }}>
              <div className="panel-heading">
                <div>
                  <h2>Recent shop records</h2>
                  <p className="muted">
                    Check the latest sales and expenses you entered.
                  </p>
                </div>
                <span className="count">
                  {transactions.length} loaded records
                </span>
              </div>

              <TransactionTable items={transactions.slice(0, 10)} />

              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: 14 }}
                onClick={() => setPage("Sales & Expenses")}
              >
                View all records
              </button>
            </section>
          </>
        )}


        {page === "Sales & Expenses" && (
          <section className="panel transactions-panel">
            <div className="panel-heading">
              <div>
                <h2>All transactions</h2>
                <p className="muted">{filteredTransactions.length} matching records</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => exportTransactions(filteredTransactions)}
              >
                <Download size={17} /> Export CSV
              </button>
            </div>

            <div className="filter-bar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search description or payment..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>
              <select aria-label="Filter transaction type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                <option value="sale">Sales</option>
                <option value="expense">Expenses</option>
              </select>
              <select aria-label="Filter payment method" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}>
                <option value="all">All payments</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <TransactionTable items={filteredTransactions} />
          </section>
        )}

        {page === "Debtor Tracker" && (
          <section className="panel coming-soon">
            <Users size={38} />
            <h2>Customer credit management</h2>
            <p className="muted">
              This page needs a customer database and repayment records. We'll build it next without treating repayments as new sales.
            </p>
          </section>
        )}

        {page === "Owner Notepad" && (
          <>
            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading"><div><h2>{editingNoteId ? "Edit note" : "New owner note"}</h2><p className="muted">Notes are saved in your database.</p></div><NotebookPen size={22} /></div>
                <form onSubmit={saveNote}>
                  <label>Title</label>
                  <input value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="e.g. Call supplier" maxLength={120} />
                  <label>Note / task details</label>
                  <textarea value={noteContent} onChange={event => setNoteContent(event.target.value)} placeholder="Write a reminder, task, or shop note..." rows={6} style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #d6dfeb", borderRadius: 9, font: "inherit", resize: "vertical", marginBottom: 14 }} />
                  <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : editingNoteId ? "Update note" : "Save note"}</button>
                  {editingNoteId && <button type="button" className="secondary-button" style={{ marginLeft: 8 }} onClick={() => { setEditingNoteId(""); setNoteTitle(""); setNoteContent(""); }}>Cancel edit</button>}
                </form>
              </div>
              <div className="panel">
                <div className="panel-heading"><div><h2>Notes & reminders</h2><p className="muted">{notes.length} saved notes</p></div><FileText size={22} /></div>
                {notes.length === 0 ? <p className="empty">No notes yet. Add your first reminder.</p> : notes.map(note => (
                  <div key={note._id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10, background: note.isCompleted ? "#f8fafc" : "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                      <div style={{ minWidth: 0 }}><h3 style={{ margin: "0 0 7px", textDecoration: note.isCompleted ? "line-through" : "none" }}>{note.title || "Untitled note"}</h3><p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#64748b" }}>{note.content || "No details"}</p><small style={{ display: "block", marginTop: 9, color: "#94a3b8" }}>Updated {new Date(note.updatedAt || note.createdAt).toLocaleString("en-IN")}</small></div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" className="secondary-button" title={note.isCompleted ? "Mark incomplete" : "Mark completed"} onClick={() => toggleNote(note)}><Check size={15} /></button>
                        <button type="button" className="secondary-button" title="Edit note" onClick={() => editNote(note)}><Pencil size={15} /></button>
                        <button type="button" className="delete-button" title="Delete note" onClick={() => deleteNote(note._id)}><X size={15} /></button>
                      </div>
                    </div>
                    {note.isCompleted && <span className="type-badge sale" style={{ display: "inline-block", marginTop: 10 }}>Completed</span>}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {page === "Cheque & Bank Tracker" && (
          <>
            <section className="panel">
              <div className="panel-heading"><div><h2>Bank balance & upcoming dues</h2><p className="muted">Enter the current bank balance, then record cheques to estimate upcoming cash requirements.</p></div><Landmark size={22} /></div>
              <form onSubmit={saveBankBalance} style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 22 }}>
                <div style={{ minWidth: 220, flex: "1 1 220px" }}><label>Current bank balance (₹)</label><input type="number" min="0" step="0.01" value={bankBalance} onChange={event => setBankBalance(event.target.value)} required /></div>
                <button type="submit" className="primary-button">Save bank balance</button>
              </form>
              <div className="report-grid">
                <div className="metric-card"><div className="metric-top">Current bank balance <Landmark size={20} /></div><h3>{money(bankSummary?.bankBalance)}</h3></div>
                <div className="metric-card"><div className="metric-top">Cheques due in 7 days <CalendarClock size={20} /></div><h3>{money(bankSummary?.dueWithinSevenDays)}</h3><p>{bankSummary?.dueSoonCount || 0} upcoming cheque(s)</p></div>
                <div className="metric-card"><div className="metric-top">Estimated balance after 7 days <Wallet size={20} /></div><h3 style={{ color: (bankSummary?.estimatedBalanceAfterSevenDays ?? 0) < 0 ? "#b42318" : undefined }}>{money(bankSummary?.estimatedBalanceAfterSevenDays)}</h3><p>After upcoming cheques only</p></div>
                <div className="metric-card"><div className="metric-top">All pending cheques <Receipt size={20} /></div><h3>{money(bankSummary?.pendingChequeTotal)}</h3><p>Estimated balance after all: {money(bankSummary?.estimatedBalanceAfterAllPending)}</p></div>
              </div>
              <p className="note">Forecasts use the bank balance and cheque records you enter. They do not connect directly to your bank account and do not include unrecorded payments.</p>
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading"><div><h2>Add upcoming cheque</h2><p className="muted">Record a cheque before its due date.</p></div><PlusCircle size={22} /></div>
                <form onSubmit={saveCheque}>
                  <label>Payee / recipient</label><input value={chequeForm.recipient} onChange={event => setChequeForm({ ...chequeForm, recipient: event.target.value })} required placeholder="Supplier or person" />
                  <label>Cheque amount (₹)</label><input type="number" min="0.01" step="0.01" value={chequeForm.amount} onChange={event => setChequeForm({ ...chequeForm, amount: event.target.value })} required />
                  <label>Due date</label><input type="date" value={chequeForm.dueDate} onChange={event => setChequeForm({ ...chequeForm, dueDate: event.target.value })} required />
                  <label>Cheque number (optional)</label><input value={chequeForm.chequeNumber} onChange={event => setChequeForm({ ...chequeForm, chequeNumber: event.target.value })} />
                  <label>Bank name (optional)</label><input value={chequeForm.bankName} onChange={event => setChequeForm({ ...chequeForm, bankName: event.target.value })} />
                  <label>Note (optional)</label><input value={chequeForm.note} onChange={event => setChequeForm({ ...chequeForm, note: event.target.value })} placeholder="Invoice or purpose" />
                  <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save cheque"}</button>
                </form>
              </div>
              <div className="panel">
                <div className="panel-heading"><div><h2>Cheque schedule</h2><p className="muted">Sorted by due date · {cheques.length} records</p></div><CalendarClock size={22} /></div>
                {cheques.length === 0 ? <p className="empty">No cheques recorded yet.</p> : <div className="table-wrap"><table><thead><tr><th>Due date</th><th>Payee</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>{cheques.map(cheque => {
                  const due = new Date(cheque.dueDate); due.setHours(0, 0, 0, 0);
                  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
                  const days = Math.round((due - todayDate) / 86400000);
                  return <tr key={cheque._id}><td>{new Date(cheque.dueDate).toLocaleDateString("en-IN")}<br /><small>{cheque.status === "upcoming" ? days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? "Due today" : `In ${days} day(s)` : ""}</small></td><td><strong>{cheque.recipient}</strong><br /><small>{[cheque.bankName, cheque.chequeNumber ? `#${cheque.chequeNumber}` : ""].filter(Boolean).join(" · ")}</small>{cheque.note && <><br /><small>{cheque.note}</small></>}</td><td className="amount">{money(cheque.amount)}</td><td><span className={`type-badge ${cheque.status === "upcoming" ? "expense" : "sale"}`}>{cheque.status}</span></td><td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{cheque.status === "upcoming" && <button type="button" className="secondary-button" onClick={() => updateChequeStatus(cheque, "cleared")}>Mark cleared</button>}{cheque.status === "upcoming" && <button type="button" className="secondary-button" onClick={() => updateChequeStatus(cheque, "cancelled")}>Cancel</button>}<button type="button" className="delete-button" onClick={() => deleteCheque(cheque._id)}>Delete</button></div></td></tr>;
                })}</tbody></table></div>}
              </div>
            </section>
          </>
        )}

        {page === "Reports" && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Transaction report</h2>
                  <p className="muted">Select a date range to update the totals and transaction list.</p>
                </div>
                <FileText size={22} />
              </div>

              <div className="filter-bar report-date-filter">
                <label>
                  From date
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={event => setStartDate(event.target.value)}
                  />
                </label>
                <label>
                  To date
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={event => setEndDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                >
                  Clear dates
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportTransactions(reportTransactions)}
                >
                  <Download size={17} /> Export report
                </button>
                <button
                  type="button"
                  className="secondary-button no-print"
                  onClick={() => window.print()}
                >
                  <Printer size={17} /> Print report
                </button>
              </div>

              <div className="report-grid">
                <div className="metric-card">
                  <div className="metric-top">Total sales <ArrowUpRight size={20} /></div>
                  <h3>{money(reportSummary.sales)}</h3>
                </div>
                <div className="metric-card">
                  <div className="metric-top">Total expenses <ArrowDownRight size={20} /></div>
                  <h3>{money(reportSummary.expenses)}</h3>
                </div>
                <div className="metric-card">
                  <div className="metric-top">Payments collected <Wallet size={20} /></div>
                  <h3>{money(reportSummary.collected)}</h3>
                </div>
                <div className="metric-card">
                  <div className="metric-top">Credit sales <Users size={20} /></div>
                  <h3>{money(reportSummary.creditSales)}</h3>
                </div>
              </div>

              <p className="note">
                These totals are calculated from the transactions currently loaded from your database. Credit repayments and product costs are not yet included.
              </p>

              {/* BUSINESS INSIGHTS */}
              <section style={{ marginTop: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <h2>Business Insights</h2>
                  <p className="muted">
                    Understand what your numbers mean and what to check next.
                  </p>
                </div>

                <div className="report-grid">
                  <div className="metric-card">
                    <div className="metric-top">
                      Sales minus expenses
                      <Wallet size={20} />
                    </div>
                    <h3>
                      {money(reportSummary.sales - reportSummary.expenses)}
                    </h3>
                    <p>
                      The amount left after subtracting recorded expenses
                      from sales. This is not confirmed profit.
                    </p>
                  </div>

                  <div className="metric-card">
                    <div className="metric-top">
                      Expense share
                      <ArrowDownRight size={20} />
                    </div>
                    <h3>
                      {reportSummary.sales > 0
                        ? `${(
                          reportSummary.expenses /
                          reportSummary.sales *
                          100
                        ).toFixed(1)}%`
                        : "N/A"}
                    </h3>
                    <p>
                      How much recorded expense there is for every ₹100
                      of sales. A higher number deserves a closer look.
                    </p>
                  </div>

                  <div className="metric-card">
                    <div className="metric-top">
                      Credit share of sales
                      <Users size={20} />
                    </div>
                    <h3>
                      {reportSummary.sales > 0
                        ? `${(
                          reportSummary.creditSales /
                          reportSummary.sales *
                          100
                        ).toFixed(1)}%`
                        : "N/A"}
                    </h3>
                    <p>
                      The share of recorded sales marked as credit.
                      These sales may still need to be collected.
                    </p>
                  </div>

                  <div className="metric-card">
                    <div className="metric-top">
                      Non-credit sales
                      <Check size={20} />
                    </div>
                    <h3>
                      {reportSummary.sales > 0
                        ? `${(
                          reportSummary.collected /
                          reportSummary.sales *
                          100
                        ).toFixed(1)}%`
                        : "N/A"}
                    </h3>
                    <p>
                      The share of sales recorded as non-credit.
                      This does not include later customer repayments.
                    </p>
                  </div>
                </div>

                <div className="panel" style={{ marginTop: 16 }}>
                  <h3 style={{ marginTop: 0 }}>What should I do next?</h3>

                  <div style={{
                    display: "grid",
                    gap: 12,
                    lineHeight: 1.7
                  }}>
                    {reportSummary.sales === 0 ? (
                      <div>
                        <strong>No sales found in this report</strong>
                        <p className="muted">
                          Try another date range or record your sales
                          so the report can calculate useful insights.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <strong>
                            {reportSummary.creditSales > 0
                              ? "1. Check customer credit"
                              : "1. Keep recording payments correctly"}
                          </strong>
                          <p className="muted">
                            {reportSummary.creditSales > 0
                              ? `You recorded ${money(reportSummary.creditSales)} in credit sales. Review customer balances and follow up on overdue payments.`
                              : "Keep cash, UPI, card and credit records accurate so you can understand how customers pay."}
                          </p>
                          {reportSummary.creditSales > 0 && (
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => setPage("Debtor Tracker")}
                            >
                              Check customer balances
                            </button>
                          )}
                        </div>

                        <div>
                          <strong>
                            {reportSummary.sales > 0 &&
                              reportSummary.expenses / reportSummary.sales >= 0.5
                              ? "2. Review your recorded expenses"
                              : "2. Keep an eye on expenses"}
                          </strong>
                          <p className="muted">
                            {reportSummary.sales > 0 &&
                              reportSummary.expenses / reportSummary.sales >= 0.5
                              ? "Recorded expenses are at least half of recorded sales. Check whether every expense is necessary and whether all records are correct."
                              : "Compare expenses with sales regularly. Make sure you record every shop expense."}
                          </p>
                        </div>

                        <div>
                          <strong>3. Check the money you actually have</strong>
                          <p className="muted">
                            Sales are not the same as cash in hand or bank.
                            Review your cash, bank balance and upcoming cheques
                            before making large payments.
                          </p>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setPage("Cheque & Bank Tracker")}
                          >
                            Review bank and cheques
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

            </section>

            <section className="panel transactions-panel">
              <div className="panel-heading">
                <div>
                  <h2>Report transactions</h2>
                  <p className="muted">{reportTransactions.length} records in the selected date range</p>
                </div>
                <CalendarDays size={22} />
              </div>
              <TransactionTable items={reportTransactions} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;