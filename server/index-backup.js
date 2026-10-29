require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// ==================== SCHEMAS ====================

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["sale", "expense"],
        required: true
    },
    amount: {
        type: Number,
        min: 0.01,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "card", "credit", "other"],
        default: "cash"
    },
    note: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        default: "Untitled note"
    },
    content: {
        type: String,
        trim: true,
        default: ""
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const chequeSchema = new mongoose.Schema({
    recipient: {
        type: String,
        trim: true,
        required: true
    },
    chequeNumber: {
        type: String,
        trim: true,
        default: ""
    },
    amount: {
        type: Number,
        min: 0.01,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    bankName: {
        type: String,
        trim: true,
        default: ""
    },
    note: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["upcoming", "cleared", "cancelled"],
        default: "upcoming"
    }
}, { timestamps: true });

const bankBalanceSchema = new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        default: "owner-bank-balance"
    },
    amount: {
        type: Number,
        min: 0,
        default: 0
    }
}, { timestamps: true });

const debtorSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        trim: true,
        match: /^[6-9]\d{9}$/
    },
    name: {
        type: String,
        trim: true,
        default: ""
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    totalCredit: {
        type: Number,
        min: 0,
        default: 0
    },
    totalPaid: {
        type: Number,
        min: 0,
        default: 0
    }
}, { timestamps: true });
const repaymentSchema = new mongoose.Schema({
    debtor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Debtor",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    note: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

debtorSchema.index({ phone: 1 }, { unique: true });

// ==================== MODELS ====================

const Debtor = mongoose.model("Debtor", debtorSchema);

const Repayment = mongoose.model("Repayment", repaymentSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const OwnerNote = mongoose.model("OwnerNote", noteSchema);
const Cheque = mongoose.model("Cheque", chequeSchema);
const BankBalance = mongoose.model("BankBalance", bankBalanceSchema);

// ==================== OWNER AUTHENTICATION ====================

function requireOwner(req, res, next) {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";

    if (!token) {
        return res.status(401).json({
            message: "Please log in as the owner."
        });
    }

    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        return res.status(500).json({
            message: "JWT_SECRET must contain at least 32 characters in server/.env."
        });
    }

    try {
        req.owner = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Your login session expired. Please log in again."
        });
    }
}

// ==================== HELPER FUNCTIONS ====================

function getDayRange(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

function summarize(transactions) {
    const sales = transactions
        .filter(item => item.type === "sale")
        .reduce((sum, item) => sum + item.amount, 0);

    const creditSales = transactions
        .filter(item =>
            item.type === "sale" &&
            item.paymentMethod === "credit"
        )
        .reduce((sum, item) => sum + item.amount, 0);

    const collected = sales - creditSales;

    const expenses = transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    return {
        sales,
        collected,
        creditSales,
        expenses,
        transactionCount: transactions.length
    };
}

// ==================== HOME ROUTE ====================

app.get("/", (req, res) => {
    res.send("DukaanTrack API is running");
});

// ==================== OWNER LOGIN ====================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body || {};

        const ownerUsername = process.env.OWNER_USERNAME;
        const passwordHash = process.env.OWNER_PASSWORD_HASH;

        if (
            !ownerUsername ||
            !passwordHash ||
            !JWT_SECRET ||
            JWT_SECRET.length < 32
        ) {
            return res.status(500).json({
                message: "Configure OWNER_USERNAME, OWNER_PASSWORD_HASH, and JWT_SECRET in server/.env."
            });
        }

        if (!username || !password || username !== ownerUsername) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const token = jwt.sign(
            {
                username: ownerUsername,
                role: "owner"
            },
            JWT_SECRET,
            {
                expiresIn: "12h"
            }
        );

        res.json({
            message: "Login successful.",
            token,
            owner: {
                username: ownerUsername
            }
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Unable to log in right now."
        });
    }
});

// ==================== TRANSACTIONS ====================

app.get("/api/transactions", requireOwner, async (req, res) => {
    try {
        const transactions = await Transaction
            .find()
            .sort({ date: -1 })
            .limit(100);

        res.json(transactions);
    } catch (error) {
        res.status(500).json({
            message: "Could not fetch transactions."
        });
    }
});

app.post("/api/transactions", requireOwner, async (req, res) => {
    try {
        const transaction = await Transaction.create(req.body);

        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not create transaction."
        });
    }
});

app.delete("/api/transactions/:id", requireOwner, async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(
            req.params.id
        );

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found."
            });
        }

        res.json({
            message: "Transaction deleted."
        });
    } catch (error) {
        res.status(400).json({
            message: "Invalid transaction ID."
        });
    }
});

// ==================== DASHBOARD ====================

app.get("/api/dashboard", requireOwner, async (req, res) => {
    try {
        const transactions = await Transaction.find();

        const now = new Date();
        const { start, end } = getDayRange(now);

        const monthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const todayTransactions = transactions.filter(item => {
            const date = new Date(item.date);
            return date >= start && date < end;
        });

        const monthTransactions = transactions.filter(
            item => new Date(item.date) >= monthStart
        );

        res.json({
            today: summarize(todayTransactions),
            month: summarize(monthTransactions)
        });
    } catch (error) {
        res.status(500).json({
            message: "Could not load dashboard."
        });
    }
});

// ==================== OWNER NOTES ====================

app.get("/api/notes", requireOwner, async (req, res) => {
    try {
        const notes = await OwnerNote
            .find()
            .sort({ updatedAt: -1 });

        res.json(notes);
    } catch (error) {
        res.status(500).json({
            message: "Could not fetch notes."
        });
    }
});

app.post("/api/notes", requireOwner, async (req, res) => {
    try {
        const note = await OwnerNote.create({
            title: req.body.title,
            content: req.body.content
        });

        res.status(201).json(note);
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not save note."
        });
    }
});

app.patch("/api/notes/:id", requireOwner, async (req, res) => {
    try {
        const updates = {};

        if (typeof req.body.title === "string") {
            updates.title = req.body.title;
        }

        if (typeof req.body.content === "string") {
            updates.content = req.body.content;
        }

        if (typeof req.body.isCompleted === "boolean") {
            updates.isCompleted = req.body.isCompleted;
        }

        const note = await OwnerNote.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!note) {
            return res.status(404).json({
                message: "Note not found."
            });
        }

        res.json(note);
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not update note."
        });
    }
});

app.delete("/api/notes/:id", requireOwner, async (req, res) => {
    try {
        const note = await OwnerNote.findByIdAndDelete(
            req.params.id
        );

        if (!note) {
            return res.status(404).json({
                message: "Note not found."
            });
        }

        res.json({
            message: "Note deleted."
        });
    } catch (error) {
        res.status(400).json({
            message: "Invalid note ID."
        });
    }
});

// ==================== CHEQUE TRACKER ====================

app.get("/api/cheques", requireOwner, async (req, res) => {
    try {
        const cheques = await Cheque
            .find()
            .sort({ dueDate: 1 });

        res.json(cheques);
    } catch (error) {
        res.status(500).json({
            message: "Could not fetch cheques."
        });
    }
});

app.post("/api/cheques", requireOwner, async (req, res) => {
    try {
        const cheque = await Cheque.create(req.body);

        res.status(201).json(cheque);
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not save cheque."
        });
    }
});

app.patch("/api/cheques/:id", requireOwner, async (req, res) => {
    try {
        const allowedFields = [
            "recipient",
            "chequeNumber",
            "amount",
            "dueDate",
            "bankName",
            "note",
            "status"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const cheque = await Cheque.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!cheque) {
            return res.status(404).json({
                message: "Cheque not found."
            });
        }

        res.json(cheque);
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not update cheque."
        });
    }
});

app.delete("/api/cheques/:id", requireOwner, async (req, res) => {
    try {
        const cheque = await Cheque.findByIdAndDelete(
            req.params.id
        );

        if (!cheque) {
            return res.status(404).json({
                message: "Cheque not found."
            });
        }

        res.json({
            message: "Cheque deleted."
        });
    } catch (error) {
        res.status(400).json({
            message: "Invalid cheque ID."
        });
    }
});

// ==================== BANK BALANCE ====================

// ==================== BANK BALANCE ====================

app.get("/api/bank-balance", requireOwner, async (req, res) => {
    try {
        const record = await BankBalance.findOne({
            key: "owner-bank-balance"
        });

        const bankBalance = record ? record.amount : 0;

        const pendingCheques = await Cheque.find({
            status: "upcoming"
        });

        // Start at midnight today.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Exclusive end: midnight after the next seven days.
        const dayAfterSevenDays = new Date(todayStart);
        dayAfterSevenDays.setDate(dayAfterSevenDays.getDate() + 8);

        // Total amount of all uncleared cheques, including overdue ones.
        const pendingChequeTotal = pendingCheques.reduce(
            (sum, cheque) => sum + Number(cheque.amount || 0),
            0
        );

        // Cheques due today through the next seven calendar days.
        const chequesDueWithinSevenDays = pendingCheques.filter(cheque => {
            const dueDate = new Date(cheque.dueDate);

            return dueDate >= todayStart &&
                dueDate < dayAfterSevenDays;
        });

        const dueWithinSevenDays = chequesDueWithinSevenDays.reduce(
            (sum, cheque) => sum + Number(cheque.amount || 0),
            0
        );

        const dueSoonCount = chequesDueWithinSevenDays.length;

        // Uncleared cheques whose due date has already passed.
        const overdueCount = pendingCheques.filter(cheque => {
            return new Date(cheque.dueDate) < todayStart;
        }).length;

        res.json({
            bankBalance,
            pendingChequeTotal,
            dueWithinSevenDays,
            estimatedBalanceAfterAllPending:
                bankBalance - pendingChequeTotal,
            estimatedBalanceAfterSevenDays:
                bankBalance - dueWithinSevenDays,
            dueSoonCount,
            overdueCount
        });
    } catch (error) {
        console.error("Bank balance calculation error:", error);

        res.status(500).json({
            message: "Could not calculate bank balance."
        });
    }
});

app.put("/api/bank-balance", requireOwner, async (req, res) => {
    try {
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({
                message: "Bank balance must be zero or a positive number."
            });
        }

        const record = await BankBalance.findOneAndUpdate(
            {
                key: "owner-bank-balance"
            },
            {
                amount
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.json(record);
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not save bank balance."
        });
    }
});

// ==================== DEBTOR TRACKER ====================

app.get("/api/debtors", requireOwner, async (req, res) => {
    try {
        const debtors = await Debtor.find().sort({ updatedAt: -1 });

        res.json(debtors.map(debtor => ({
            ...debtor.toObject(),
            outstanding: debtor.totalCredit - debtor.totalPaid
        })));
    } catch (error) {
        res.status(500).json({
            message: "Could not fetch debtors."
        });
    }
});

app.post("/api/debtors", requireOwner, async (req, res) => {
    try {
        const phone = String(req.body.phone || "").trim();
        const name = String(req.body.name || "").trim();
        const description = String(req.body.description || "").trim();
        const amount = Number(req.body.amount);

        if (!/^[6-9]\d{9}$/.test(phone)) {
            return res.status(400).json({
                message: "Enter a valid 10-digit Indian mobile number."
            });
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                message: "Credit amount must be greater than zero."
            });
        }

        let debtor = await Debtor.findOne({ phone });

        if (debtor) {
            debtor.totalCredit += amount;

            if (name) debtor.name = name;
            if (description) debtor.description = description;

            await debtor.save();
        } else {
            debtor = await Debtor.create({
                phone,
                name,
                description,
                totalCredit: amount,
                totalPaid: 0
            });
        }

        res.status(201).json({
            ...debtor.toObject(),
            outstanding: debtor.totalCredit - debtor.totalPaid
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A debtor with this phone number already exists."
            });
        }

        res.status(400).json({
            message: error.message || "Could not save debtor."
        });
    }
});
// ==================== RECORD DEBTOR REPAYMENT ====================

app.post("/api/debtors/:id/payment", requireOwner, async (req, res) => {
    try {
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                message: "Payment amount must be greater than zero."
            });
        }

        const debtor = await Debtor.findById(req.params.id);

        if (!debtor) {
            return res.status(404).json({
                message: "Debtor not found."
            });
        }

        const outstanding = debtor.totalCredit - debtor.totalPaid;

        if (amount > outstanding) {
            return res.status(400).json({
                message: "Payment cannot exceed the outstanding amount."
            });
        }

        debtor.totalPaid += amount;
        await debtor.save();

        res.json({
            message: "Repayment recorded successfully.",
            debtor: {
                ...debtor.toObject(),
                outstanding: debtor.totalCredit - debtor.totalPaid
            }
        });
    } catch (error) {
        res.status(400).json({
            message: "Could not record repayment."
        });
    }
});

/* ==================== DEBTOR TRACKER ==================== */

// Get all debtors and their outstanding balances
app.get("/api/debtors", requireOwner, async (req, res) => {
    try {
        const debtors = await Debtor.find().sort({ updatedAt: -1 });

        res.json(debtors.map(debtor => ({
            ...debtor.toObject(),
            outstanding: Math.max(
                0,
                debtor.totalCredit - debtor.totalPaid
            )
        })));
    } catch (error) {
        res.status(500).json({ message: "Could not load debtors." });
    }
});

// Add credit to a debtor, identified by phone number
app.post("/api/debtors", requireOwner, async (req, res) => {
    try {
        const phone = String(req.body.phone || "").trim();
        const name = String(req.body.name || "").trim();
        const amount = Number(req.body.amount);

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                message: "Enter a valid 10-digit phone number."
            });
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                message: "Credit amount must be greater than zero."
            });
        }

        let debtor = await Debtor.findOne({ phone });

        if (!debtor) {
            debtor = new Debtor({ phone, name });
        } else if (name && !debtor.name) {
            debtor.name = name;
        }

        debtor.totalCredit += amount;
        await debtor.save();

        // Keep credit sales in the existing dashboard.
        await Transaction.create({
            type: "sale",
            amount,
            paymentMethod: "credit",
            note: `Credit sale - ${phone}`
        });

        res.status(201).json({
            ...debtor.toObject(),
            outstanding: debtor.totalCredit - debtor.totalPaid
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This phone number already exists. Please try again."
            });
        }

        res.status(400).json({
            message: error.message || "Could not record credit."
        });
    }
});

// Record a repayment without adding a new sale
app.post("/api/debtors/:id/repayments", requireOwner, async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const note = String(req.body.note || "").trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                message: "Repayment must be greater than zero."
            });
        }

        const debtor = await Debtor.findById(req.params.id);

        if (!debtor) {
            return res.status(404).json({
                message: "Debtor not found."
            });
        }

        const outstanding = debtor.totalCredit - debtor.totalPaid;

        if (amount > outstanding + 0.000001) {
            return res.status(400).json({
                message: `Repayment cannot exceed the outstanding balance of ₹${outstanding.toFixed(2)}.`
            });
        }

        await Repayment.create({
            debtor: debtor._id,
            amount,
            note
        });

        debtor.totalPaid += amount;
        await debtor.save();

        res.status(201).json({
            ...debtor.toObject(),
            outstanding: debtor.totalCredit - debtor.totalPaid
        });
    } catch (error) {
        res.status(400).json({
            message: error.message || "Could not record repayment."
        });
    }
});

// View repayment history for a debtor
app.get("/api/debtors/:id/repayments", requireOwner, async (req, res) => {
    try {
        const repayments = await Repayment.find({
            debtor: req.params.id
        }).sort({ date: -1 });

        res.json(repayments);
    } catch (error) {
        res.status(400).json({
            message: "Could not load repayment history."
        });
    }
});


// ==================== CONNECT TO MONGODB ====================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(
                `DukaanTrack server running on http://localhost:${PORT}`
            );
        });
    })
    .catch(error => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );
    });