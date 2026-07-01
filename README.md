# Restaurant API

Shared LogDine backend for the `hotel/` restaurant-management frontend and the upcoming unified superadmin frontend.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and a private `SUPERADMIN_PASSWORD`.
3. Install dependencies with `npm install`.
4. Start the service with `npm run dev` or `npm start`.

The API port is controlled by `PORT` and defaults to `5001`. The server creates and upgrades its PostgreSQL schema on startup.

From `hotel/`, `npm run backend` starts this service. The hotel tenant-isolation suite also targets this API.

For Render deployment, use `render.yaml` with `restaurant-api` as the service root and set the secret environment variables in the Render dashboard. Render supplies `PORT` automatically.

## Printer Setup

KOT and bill printing are disabled unless `PRINTER_ENABLED=true` is set in the running backend environment. For a single shared printer, set `KITCHEN_PRINTER_IP` and optionally `KITCHEN_PRINTER_PORT` on the server. Per-restaurant `kitchen_printer_ip` and `kitchen_printer_port` values still override the server default when present.

Run `npm run migrate:printers` to add the printer settings columns to an existing database before saving printer values from the settings page.

## Android Bluetooth Bill Printing

The Android PWA can open the manufacturer Bluetooth Print app with `my.bluetoothprint.scheme://`. Set `PUBLIC_API_BASE_URL`, `PRINT_TOKEN_SECRET`, and `PRINT_TOKEN_EXPIRY_SECONDS` in production. Staff request a short-lived URL from `POST /api/print/orders/:orderId/bluetooth-url`; the Bluetooth Print app then fetches `GET /api/print/orders/:orderId/bluetooth?token=...`. Use `GET /api/print/orders/:orderId/bluetooth-preview` while logged in to preview the receipt JSON in a browser.

## Main Route Groups

- Restaurant operations: `/auth`, `/profile`, `/menu`, `/tables`, `/orders`, `/reservations`, `/deliveries`
- Business operations: `/inventory`, `/payroll/staff`, `/tasks`, `/crm/customers`, `/recipes`, `/reports/overview`, `/settings`
- Legacy hotel superadmin compatibility: `/superadmin/restaurants`, `/superadmin/support`, `/superadmin/settings`
- Unified superadmin API: `/superadmin/dashboard`, `/superadmin/tenants`, `/superadmin/users`, `/superadmin/orders`, `/superadmin/revenue`, `/superadmin/analytics`, `/superadmin/subscriptions`
- Tenant payment configuration: `/superadmin/tenants/:tenantId/payment-config`

Payment configuration secrets are stored in PostgreSQL and returned to frontend clients only as masked values.
