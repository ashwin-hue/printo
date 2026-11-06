# Printo — Online Printing Management Platform
> **Print Without Waiting.**
> A production-grade SaaS web application connecting university students and professionals with local printing shops. Eliminate physical queues, upload remotely, inspect in-browser via PDF.js, and collect completed documents in under 30 seconds.

---

## 📂 Project Architecture (Split Folders)

The project is split into two dedicated applications:

| Folder | Application | Default Port | Description |
|---|---|---|---|
| [`customer/`](file:///d:/printo/customer) | **Customer Printing Portal** | `http://localhost:5173` | Student/customer facing portal: landing page, shop radar discovery, PDF upload & configuration wizard, real-time order tracking, receipts. |
| [`shops/`](file:///d:/printo/shops) | **Shop Owner Dispatch Console** | `http://localhost:5174` | Printing vendor console: live laser queue, in-browser PDF inspection & native browser printing, order status updates, dynamic rate card pricing, and shop settings. |

### 🚀 Running the Applications

#### 1. Run Both / Workspaces (From Root)
```bash
# Start Customer Portal (port 5173)
npm run dev:customer

# Start Shop Owner Console (port 5174)
npm run dev:shops

# Build both applications
npm run build
```

#### 2. Run Independently (Inside Each Folder)
```bash
# Customer Side
cd customer
npm install
npm run dev

# Shop Side
cd shops
npm install
npm run dev
```

---

## 🎨 Creative Direction & Awwwards Design Audit

### Top 10 Weak Design Decisions Identified & Addressed:

1. **Hero Headline Typographic Integrity**: Replaced childish wavy underlines with an architectural gradient treatment paired with a luminous precision underline bar that reinforces high-speed laser calibration.
2. **Interactive Live Dispatch Simulator**: Transformed the static hero card into a fully interactive tuning console where visitors can switch between B&W/Color, single/double sided, and copy counts with instant live mathematical recalculation.
3. **Editorial Problem/Solution Split Screen**: Elevated the "Old Way vs Printo Way" comparison into a dramatic high-contrast confrontation: deep obsidian dark card with crimson alert accents vs luminous frosted glass with emerald verification signals.
4. **Campus Quadrangle Print Radar**: Replaced basic flat div grids with an architectural cybernetic radar HUD complete with concentric range rings, distance vectors, GPS coordinate markers, and interactive shop beacon cards.
5. **Technical Sequential Calibration Nodes**: Upgraded basic number circles in the Order Wizard into sequential calibration nodes (`NODE 01: DESTINATION HUB`, `NODE 02: DOCUMENT PAYLOAD & INSPECTION`, `NODE 03: LASER & FINISHING SPECS`).
6. **Mobile App Experience & Floating Dock**: Implemented an iOS/PWA-grade glassmorphic floating bottom navigation dock for mobile devices (<768px) with a prominent quick-upload action center.
7. **GSAP Entrance Orchestration**: Integrated GSAP easing for staggered entrance reveals, live status pulses, and fluid transitions.
8. **Document Preview & Native Printing**: Engineered a dedicated multi-page in-browser canvas viewer using PDF.js with real-time page count extraction, zoom scaling (50% to 200%), page flipping, and native browser print dispatch (`window.print()`).
9. **Role Switcher for Instant Dual-Perspective Testing**: Added a persistent, prominent Role Switcher Pill (`Customer / Student` ↔ `Shop Owner`) enabling instant switching and bidirectional state synchronization.
10. **Official Itemized Print Invoices**: Designed a clean, printable tax invoice and pickup pass modal complete with token verification codes and GST breakdown.

---

## 🚀 Key Features

### 🎓 1. Customer & Student Experience
- **Shop Discovery**: Search verified campus printing vendors by distance, rating, open status, and services (Spiral binding, CAD plotters, color labs).
- **Interactive Radar Map**: Visual representation of university quadrangle print hubs with real-time queue lengths and turnarounds.
- **Client-Side PDF Inspection**: Live parsing with PDF.js to determine exact page counts, file size validation, and protection against corrupted PDFs.
- **Granular Print Configuration**:
  - Copies count
  - Black & White Laser vs Vibrant Color
  - Single-Sided vs Double-Sided (with automatic paper savings discount)
  - Paper Size (A4, A3, Letter) & Orientation (Portrait, Landscape)
  - Page Range selection (All pages or custom ranges like `1-10, 14, 20-32`)
  - Spiral Wire Binding, Corner Stapling, Hardcover Thesis Binding, Thermal Lamination
  - Special Instructions note for shop operators
- **Real-Time Order Tracking**:
  - Dynamic 5-stage progress indicator: *Submitted → Accepted → Printing → Ready for Pickup → Completed*
  - Pickup Token Code (e.g. `PRN-8842`) for 30-second grab-and-go
  - Direct phone call & directions links to the shop
  - Order cancellation support while pending
- **Printable Receipts**: Itemized digital tax invoice with pickup pass.

### 🏪 2. Printing Shop Owner Dashboard
- **Daily Business Telemetry**: Today's revenue, active laser press queue, pending requests, and completed orders.
- **Incoming Orders Queue**: Review customer specifications with 1-click **Accept** or **Reject** (with customized rejection reason).
- **In-Browser Document Preview (PDF.js)**:
  - Multi-page canvas navigation (Page X of Y)
  - Zoom controls (Fit, 60% – 200%)
  - Native Browser Printing: Triggers browser print dialog formatted with exact print styling
- **Laser Queue Management**: Move jobs from *Accepted* → *Printing* → *Ready for Pickup* → *Completed*.
- **Pricing Configuration Engine**: Adjust B&W rates, color rates, double-sided discounts, spiral binding fees, and lamination costs in real time.
- **Business Profile Settings**: Manage shop name, address, direct phone line, and operating hours.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite 6
- **Styling**: Tailwind CSS, Custom Glassmorphism, CSS Grid & Flexbox
- **Icons**: Lucide React
- **Animations**: GSAP (GreenSock Animation Platform), Canvas-Confetti
- **Document Processing**: PDF.js (`pdfjs-dist`)
- **Native Browser Print**: Multi-page printable iframe engine
- **State & Persistence**: LocalStorage reactive engine with custom cross-tab events
- **Testing & Visual Verification**: Playwright Chromium

---

## 📦 Database & Data Architecture

```typescript
// Users
User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'shop_owner';
  avatar?: string;
  created_at: string;
}

// Shops
Shop {
  id: string;
  owner_id: string;
  shop_name: string;
  tagline: string;
  address: string;
  distance: string;
  latitude: number;
  longitude: number;
  phone: string;
  opening_hours: string;
  is_active: boolean;
  rating: number;
  review_count: number;
  avg_turnaround_mins: number;
  current_queue_orders: number;
  services: string[];
  banner_color: string;
  accepting_orders: boolean;
}

// Orders
Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  shop_id: string;
  shop_name: string;
  status: 'pending' | 'accepted' | 'printing' | 'ready' | 'completed' | 'rejected' | 'cancelled';
  document: OrderDocument;
  copies: number;
  color_mode: 'bw' | 'color';
  paper_size: 'A4' | 'A3' | 'Letter';
  sides: 'single' | 'double';
  orientation: 'portrait' | 'landscape';
  page_range: string;
  binding_type: 'none' | 'spiral' | 'stapling' | 'hardcover';
  lamination: boolean;
  special_instructions?: string;
  total_pages_to_print: number;
  cost_breakdown: {
    paper_and_print: number;
    binding: number;
    finishing: number;
    taxes: number;
  };
  total_price: number;
  created_at: string;
  estimated_pickup_time?: string;
}
```

---

## 🚀 Running the Application Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

5. **Run Playwright Verification**:
   ```bash
   node test-verify.js
   ```

