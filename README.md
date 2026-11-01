# Report Buddy (RetailKhata) - Mobile-First Daily Sales, Z-Report Scanner & Monthly Analytics

🌐 **Live Application**: [https://report-buddy-v2x7.onrender.com](https://report-buddy-v2x7.onrender.com)

A production-grade, mobile-first web application designed specifically for retail shop owners. Snap a photo of your **End-Of-Day (EOD) Z-Report** at store closing, store all sold products, quantities, and **HSN codes** in a secure SQL database with **authentication**, **authorization**, and generate comprehensive **Monthly Sales Reports with data analytics**.

---

### 🔑 Demo Account
- **Live URL**: [https://report-buddy-v2x7.onrender.com](https://report-buddy-v2x7.onrender.com)
- **Email**: `demo@retailstore.com`
- **Password**: `demo1234`
*(Or use the 1-click **"Demo Shop Sign In"** button on the sign-in modal)*

---

## 🚀 What's New: Production Backend, Auth & Database

1. **Free SQL Database (`retail_database.sqlite`)**:
   - Powered by `better-sqlite3` running in WAL mode (Write-Ahead Logging).
   - Relational tables:
     - `users` (Store profile, credentials, role, GSTIN)
     - `products` (Product catalog with HSN codes, buying/selling prices, GST tax rates, stock)
     - `z_reports` (Daily closing reports, gross/net revenue, payment breakdown, unique constraint per day)
     - `z_report_items` (Itemized line items sold each day with quantity, unit price, and HSN code)
   - Zero cloud configuration required — runs on disk with full ACID guarantees.

2. **Authentication & Multi-Tenant Authorization**:
   - **Bcrypt Password Hashing**: Passwords are securely hashed with bcrypt (salt rounds: 10).
   - **JWT Tokens**: 30-day secure session tokens.
   - **Multi-Tenant Shop Isolation**: Every query enforces `WHERE user_id = req.user.id`. One store owner can never see or modify another store's inventory or sales data.
   - **Pre-seeded Demo Store**: 1-click **"Demo Shop Sign In"** allows instant exploration:
     - Email: `demo@retailstore.com`
     - Password: `demo1234`
   - **New Store Registration**: Register your own retail shop with Custom Shop Name, Owner Name, GSTIN, and Currency.

3. **Production Fullstack Server**:
   - Single Express production server serves both the REST API and the compiled React PWA frontend.

---

## ✨ Core Features

### 1. 🧾 End-Of-Day (EOD) Z-Report Scanner (Free LLM)
- **Zero Cost AI**: Powered by **Google Gemini 1.5 / 2.0 Flash** via Google AI Studio Free Tier (15 requests/min, 1,500 requests/day, **100% free with no credit card required**).
- **Designed for POS Cash Registers**: Tailored specifically for thermal register closing receipts, POS daily summaries, and handwritten closing sheets.
- **Automated Extraction**:
  - Exact Date of sales & Z-Report / Shift # (e.g. `Z-0048`)
  - Gross Sales, Net Daily Sales, Discounts & Taxes
  - Payment collection breakdown (Cash, UPI / QR, Card)
  - **Itemized Product Breakdown**: Product name, HSN/SAC code, quantity sold, unit rate, line total, and GST rate.
- **Auto-Cataloging**: Automatically registers any newly discovered items into your Product Catalog in the database.
- **1-Click Demo Mode**: Built-in sample thermal Z-reports so you can test the scanning and analytics workflow instantly without uploading anything!

### 2. 📅 Date Navigation (Daily Sales Journal)
- **Navigate Sales by Date**:
  - `< Previous Day` / `Next Day >` buttons, quick calendar jump, and `Today` shortcut.
  - Interactive 7-day strip with indicators showing which days have Z-reports verified.
- **Detailed Daily Breakdown**:
  - Displays verified Z-report status, shift closing time, and payment collection mode chips.
  - **Itemized Table of Products Sold on that Date**: Every product, HSN code, quantity sold, unit price, and line total.
  - If a date has no Z-report logged, displays a 1-click **"Upload Z-Report for this Date"** action.

### 3. 📊 Monthly Sales Report & Data Analytics
- **Month Selector**: View reports for any month (e.g. November 2026, October 2026, etc.).
- **Executive KPI Analytics**:
  - Total Monthly Net Revenue & Gross Sales
  - Total Units Sold across all days
  - Average Daily Sales
  - Highest Sales Day (Peak Revenue)
- **Interactive Daily Revenue Bar Chart**: Visual trend bar chart showing daily revenue for each day of the month. Tap any day bar to jump directly into its full Z-report breakdown!
- **Top 5 Best-Selling Products**: Ranked by monthly revenue and units sold, complete with percentage contribution progress bars.
- **Monthly HSN Tax Summary (GSTR-1 Ready)**: Grouped by HSN/SAC code with units sold, taxable value, and tax collected — essential for retail GST return filing.
- **Payment Distribution**: Visual comparison of Cash vs UPI vs Card revenue.
- **Export to CSV**: Download the complete monthly summary (daily totals + itemized product breakdown) into an Excel-friendly CSV spreadsheet.

### 4. 📦 Product Catalog with HSN Code & Price
- Add, edit, and organize products:
  - **Product Name**
  - **HSN/SAC Code** (Harmonized System of Nomenclature for GST compliance)
  - **Selling Price** and **Cost/Purchase Price** (with automated gross margin calculation)
  - **Tax Rate (%)** (0%, 5%, 12%, 18%, 28%)
  - **Unit** (`pcs`, `kg`, `box`, `jar`, `bag`, `mtr`, etc.)
  - **Stock Tracking & Low-Stock Alerts**

---

## 🚀 Running the Application

### Option A: Production Server (All-in-One on Port 5000)
Runs the production Express backend + compiled React frontend on a single port:
```bash
npm run build
npm start
```
Access at: **`http://localhost:5000`**

### Option B: Development Server (Vite Hot-Reload on Port 5173)
Vite dev server with automatic `/api` proxy to the Express backend:
```bash
# Terminal 1: Backend API & SQLite DB
npm run server

# Terminal 2: Vite Frontend with HMR
npm run dev
```
Access at: **`http://localhost:5173`**

---

## 🔐 Demo Credentials

To test immediately without registering:
- **Email**: `demo@retailstore.com`
- **Password**: `demo1234`
*(Or click the **"1-Click Demo Store Login"** banner inside the app)*
