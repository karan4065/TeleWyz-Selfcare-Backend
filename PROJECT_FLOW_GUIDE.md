# TeleWyz E-Care — Complete Project Flow & Architecture Guide

Welcome to the **TeleWyz E-Care Backend Guide**! This document explains how the entire telecom self-care platform works from end to end in simple, practical terms.

---

## 1. What is TeleWyz E-Care?

TeleWyz E-Care is a **Telecom Self-Care Platform** (similar to apps like *Airtel Thanks*, *MyJio*, *MTN Self-Care*, or *MyVodafone*). 

Subscribers use it to:
- Log in with their mobile number (MSISDN) or Firebase Auth.
- Check their real-time data, voice, and SMS balances.
- Buy airtime, data bundles, and postpaid bill payments.
- Pick and reserve a new phone number (normal or VIP/platinum).
- Order a Physical SIM (delivered to their doorstep) or an eSIM (with instant QR code).
- Complete biometric identity verification (NIMC/NCC NIN KYC).
- Switch mobile networks (Mobile Number Portability — MNP).
- Link family numbers under one master account with permission controls.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    Client["Mobile App / Web Frontend / Postman"]
    
    subgraph Middleware_Pipeline ["15-Layer Security & Middleware Pipeline"]
        M1["1. Correlation ID (x-correlation-id)"]
        M2["2. Helmet Security Headers"]
        M3["3. CORS Origin Guard"]
        M4["4. Body Size Limiter (1MB)"]
        M5["5. Pino Request Logger (Redacts PII)"]
        M6["6. Maintenance Gate"]
        M7["7. Token Bucket Rate Limiter"]
        M8["8. Firebase & JWT Auth Middleware"]
        M9["9. Role-Based Access Control (RBAC)"]
        M10["10. Zod Schema Validation"]
        M11["11. Idempotency Protection (Idempotency-Key)"]
        M12["12. Webhook HMAC-SHA256 Signature Validator"]
        M13["13. Security Audit Logger"]
        M14["14. 404 Route Handler"]
        M15["15. Centralized Error Handler"]
    end

    subgraph Business_Domains ["Domain Modules (Controllers + Services)"]
        Auth["Auth & Sessions Module"]
        Sub["Subscriber & Accounts Module"]
        Dash["Aggregated Dashboard Module"]
        Cat["Product Catalogue Module"]
        Res["Number Reservation Module"]
        Sim["SIM & KYC Module"]
        Mnp["MNP Porting Module"]
        Pay["Payments & Recharge Module"]
        Ord["Unified Orders Module"]
        Notif["Async Notifications Module"]
        Serv["Loyalty, Stores & Tickets Module"]
    end

    subgraph Persistence ["Database & Cache"]
        PG[("PostgreSQL Database\n(telewyz_ecare via Prisma)")]
        Redis[("Redis / Memory Cache\n(Rate limits, locks, sessions)")]
    end

    subgraph External_Integrations ["Authoritative Telecom Integrations (Adapters)"]
        BSS["Optiva EPC / BSS\n(Balances, Usage & HLR Provisioning)"]
        IAM["Central IAM / Firebase Auth"]
        GW["Payment Gateway"]
        NIMC["NIMC / NCC Biometric KYC"]
        SMS["SMS Gateway"]
        SMTP["SMTP Mailer"]
        FCM["Firebase Push Notifications"]
        LOG["Logistics Courier Dispatch"]
        DMP["Dealer Management Platform"]
        CVM["Customer Value Management"]
        COMM["Community Support Portal"]
        DWH["Data Warehouse Stream"]
    end

    Client --> Middleware_Pipeline
    Middleware_Pipeline --> Business_Domains
    Business_Domains --> Persistence
    Business_Domains --> External_Integrations
```

---

## 3. How a Request Travels Through the Backend

Every single request follows the clean **Controller → Service → Repository/Adapter** pattern:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (App/Browser)
    participant Pipe as Middleware Pipeline
    participant Ctrl as Controller
    participant Svc as Service (Business Logic)
    participant Repo as Repository (Database)
    participant Ext as External Adapter (BSS / KYC / Gateway)

    User->>Pipe: HTTP Request (e.g. POST /api/v1/sim/order)
    Pipe->>Pipe: 1. Validate Correlation ID & Security Headers
    Pipe->>Pipe: 2. Check Rate Limits & Maintenance Mode
    Pipe->>Pipe: 3. Validate Request Body with Zod Schema
    Pipe->>Ctrl: Forward clean, validated payload
    Ctrl->>Svc: Call Domain Method (e.g. createSimOrder)
    Svc->>Svc: Validate telecom business rules
    Svc->>Ext: Check external authority (e.g. Logistics or BSS)
    Ext-->>Svc: Response from external system
    Svc->>Repo: Save state in PostgreSQL (telewyz_ecare)
    Repo-->>Svc: Saved database entity
    Svc-->>Ctrl: Clean domain result
    Ctrl->>User: Standard JSON Response { success: true, data: {...}, requestId: "..." }
```

---

## 4. Step-by-Step Business Workflows

### Workflow 1: Login & Authentication (MSISDN OTP vs Firebase)

```mermaid
sequenceDiagram
    autonumber
    actor User as Subscriber
    participant API as TeleWyz Auth API
    participant Cache as Redis / In-Memory Cache
    participant DB as PostgreSQL (telewyz_ecare)
    participant SMS as SMS Gateway
    participant IAM as Central IAM / Firebase

    alt Method A: Telecom MSISDN OTP Login
        User->>API: POST /api/v1/auth/otp/send { msisdn: "2348012345678" }
        API->>Cache: Check cooldown timer (60s)
        API->>API: Generate 6-digit OTP & SHA-256 hash
        API->>DB: Save hashed OTP with 5-minute expiry
        API->>SMS: Dispatch SMS with OTP to subscriber phone
        API-->>User: { success: true, cooldownSeconds: 60 }

        User->>API: POST /api/v1/auth/otp/verify { msisdn: "2348012345678", code: "123456" }
        API->>DB: Find OTP record & compare hash (max 3 attempts)
        API->>DB: Find or create Subscriber record
        API->>DB: Create new active Session record
        API->>API: Generate JWT Access Token (1h) & Refresh Token (7d)
        API-->>User: Return JWT Token, Refresh Token & Subscriber Profile
    else Method B: Firebase Auth Token Login
        User->>API: POST /api/v1/auth/firebase-login { idToken: "..." }
        API->>IAM: Verify token with Firebase Admin SDK
        IAM-->>API: Verified claims (uid, phone, email)
        API->>DB: Link Firebase UID to Subscriber in PostgreSQL
        API-->>User: Return TeleWyz JWT Token & Session
    end
```

---

### Workflow 2: Aggregated Dashboard (BSS Authority)

> [!IMPORTANT]
> **Why Telecom Balances Are NOT Stored in Local DB:**
> In telecom architecture, subscribers make calls, send SMS, and stream video every second. The **Optiva EPC / BSS** (Business Support System) is the real-time metering engine that tracks every byte. TeleWyz queries BSS directly so the user always sees their exact, up-to-the-second balance.

```mermaid
sequenceDiagram
    autonumber
    actor User as Subscriber
    participant Dash as Dashboard Service
    participant DB as PostgreSQL
    participant BSS as BSS / Optiva EPC
    participant CVM as Customer Value Mgmt

    User->>Dash: GET /api/v1/dashboard (Bearer JWT)
    Dash->>DB: Fetch Subscriber details & loyalty points
    par Query Authoritative External Systems in Parallel
        Dash->>BSS: getBalances(msisdn) -> Prepaid Balance / Postpaid Bill
        Dash->>BSS: getUsage(msisdn) -> Data (GB), Voice (Mins), SMS counts
        Dash->>CVM: getPersonalizedOffers(msisdn) -> Tailored deals
    end
    Dash->>Dash: Calculate usage percentages & expiry countdowns
    Dash-->>User: Complete aggregated dashboard snapshot
```

---

### Workflow 3: SIM Purchase & KYC Activation (Physical SIM & eSIM)

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant API as SIM Module
    participant KYC as NIMC / NCC KYC Adapter
    participant BSS as BSS HLR Provisioning
    participant Log as Courier Logistics

    User->>API: 1. POST /api/v1/sim/order (Physical SIM or eSIM)
    alt Physical SIM
        API->>Log: Create parcel dispatch order (generates tracking number)
    else eSIM
        API->>API: Generate digital eSIM profile (LPA:1$smdp.telewyz.net$...)
    end
    API-->>User: Order created with status: PENDING_KYC

    User->>API: 2. POST /api/v1/sim/kyc/verify { orderNumber, nin: "22345678901" }
    API->>KYC: Verify National Identity Number against NIMC database
    KYC-->>API: Match confirmed (KYC status = VERIFIED)
    API-->>User: KYC Verified successfully

    User->>API: 3. POST /api/v1/sim/activate { orderNumber }
    API->>API: Check state guard: Is KYC status VERIFIED?
    API->>BSS: provisionSim(msisdn, iccid, simType) on network HLR
    BSS-->>API: Network reference: BSS-HLR-XXXXX (Status: ACTIVE)
    API-->>User: SIM is now LIVE on TeleWyz network!
```

---

### Workflow 4: Concurrency-Safe Number Reservation

Prevents two people from reserving or buying the exact same phone number at the same millisecond:

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Customer A
    actor UserB as Customer B
    participant API as Reservation Service
    participant Cache as Redis / In-Memory Lock
    participant DB as PostgreSQL

    UserA->>API: POST /api/v1/numbers/reserve { msisdn: "2348011112222" }
    UserB->>API: POST /api/v1/numbers/reserve { msisdn: "2348011112222" }

    API->>Cache: Atomic Lock: lock:reserve:2348011112222
    Note over API,Cache: Customer A acquires lock first!
    API->>DB: Set status = RESERVED with 15-minute hold timer
    API-->>UserA: 201 Created (Number reserved for 15 mins)

    API-->>UserB: 409 Conflict / 400 Bad Request ("Number already reserved")
```

---

### Workflow 5: Mobile Number Portability (MNP)

Switching from another network (MTN, Airtel, Glo, 9mobile) to TeleWyz without changing your number:

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant MNP as MNP Service
    participant KYC as NIMC Registry
    participant NCC as Central Clearinghouse (NPC)
    participant SMS as SMS Gateway

    User->>MNP: 1. POST /api/v1/mnp/validate { msisdn, donorOperator: "MTN" }
    MNP->>MNP: Check donor eligibility (not barred, active >30 days)
    MNP-->>User: Eligible for porting!

    User->>MNP: 2. POST /api/v1/mnp/request { msisdn, donor: "MTN", simType: "ESIM", nin: "..." }
    MNP->>KYC: Verify National Identity Number
    MNP->>NCC: Submit porting request to NCC Central Clearinghouse
    MNP->>SMS: Send instructions: "Reply 'PORT' when prompted by NCC"
    MNP-->>User: Porting order created (Status: SUBMITTED)

    User->>MNP: 3. GET /api/v1/mnp/status/:requestId
    MNP-->>User: Live status tracking (SUBMITTED -> VALIDATED -> COMPLETED)
```

---

### Workflow 6: Recharge, Payments & Webhooks (Idempotent)

> [!CAUTION]
> **Golden Telecom Payment Rule:**
> Never trust payment success from the mobile app or browser! The backend always verifies the transaction directly with the payment provider via server-to-server verification or cryptographically signed HMAC webhooks.

```mermaid
sequenceDiagram
    autonumber
    actor User as Subscriber
    participant Pay as Payment Module
    participant GW as Payment Gateway
    participant BSS as BSS Balance Topup
    participant SMS as SMS Gateway

    User->>Pay: POST /api/v1/payments/recharge { amount: 1000, msisdn: "..." }
    Note over User,Pay: Includes header: Idempotency-Key: uuid-1234
    Pay->>GW: initiatePayment(transactionId, 1000 NGN)
    GW-->>Pay: Returns checkoutUrl & gatewayReference
    Pay-->>User: { checkoutUrl: "https://checkout.telewyz-pay.com/..." }

    User->>GW: Complete payment with card/bank/USSD
    GW->>Pay: POST /api/v1/payments/webhook
    Note over GW,Pay: Includes header: x-signature: HMAC-SHA256(payload)
    Pay->>Pay: Verify cryptographic HMAC signature
    Pay->>GW: verifyPayment(gatewayReference) -> Confirmed SUCCESS
    Pay->>BSS: topupPrepaidBalance(msisdn, 1000) -> Credit BSS wallet
    Pay->>SMS: Send SMS: "Recharge of ₦1,000 successful! Ref: TX-..."
    Pay-->>GW: 200 OK
```

---

### Workflow 7: Associated Accounts (Family & Secondary Lines)

Allows a parent or business account to manage secondary numbers with strict permission control:

```mermaid
sequenceDiagram
    autonumber
    actor Parent as Primary Subscriber
    actor Child as Secondary Phone Holder
    participant API as Subscriber Module
    participant SMS as SMS Gateway

    Parent->>API: 1. POST /api/v1/subscriber/associated-accounts/link { secondaryMsisdn: "2348098765432" }
    API->>API: Generate linking OTP
    API->>SMS: Send OTP to Child's phone: "Parent account wants to link your line. Code: 123456"
    API-->>Parent: Link pending OTP verification

    Parent->>API: 2. POST /api/v1/subscriber/associated-accounts/verify { secondaryMsisdn, otpCode: "123456" }
    API->>API: Verify OTP matches
    API->>API: Mark associated account: VERIFIED
    API-->>Parent: Line successfully linked!

    Parent->>API: 3. POST /api/v1/subscriber/switch-account { targetMsisdn: "2348098765432" }
    API->>API: Verify permissions (e.g. VIEW_BALANCE, RECHARGE)
    API-->>Parent: Returns context-switched token for the secondary line
```

---

## 5. Database Schema & Relationships

All tables are created in the **`telewyz_ecare`** PostgreSQL database via Prisma:

```mermaid
erDiagram
    Subscriber ||--o{ Session : "has active devices"
    Subscriber ||--o{ AssociatedAccount : "manages secondary lines"
    Subscriber ||--o{ SimOrder : "places"
    Subscriber ||--o{ MnpRequest : "requests"
    Subscriber ||--o{ Order : "owns"
    Subscriber ||--o{ SubscriptionRecord : "subscribes to"
    Subscriber ||--o{ SupportTicket : "opens"

    Order ||--o{ OrderStatusHistory : "tracks state transitions"

    Subscriber {
        string id PK
        string msisdn UK
        string email
        string firstName
        string lastName
        string accountType "PREPAID / POSTPAID"
        string status "ACTIVE / SUSPENDED / BARRED"
        string role "SUBSCRIBER / AGENT / ADMIN"
        int loyaltyPoints
        string firebaseUid UK
    }

    Session {
        string id PK
        string subscriberId FK
        string token UK
        string refreshToken UK
        string deviceId
        boolean revoked
        datetime expiresAt
    }

    OtpCode {
        string id PK
        string msisdn
        string codeHash
        string purpose
        int attempts
        int maxAttempts
        boolean verified
        datetime expiresAt
        datetime cooldownUntil
    }

    NumberReservation {
        string id PK
        string msisdn UK
        string category "NORMAL / SILVER / GOLD / PLATINUM"
        decimal price
        string status "AVAILABLE / RESERVED / ASSIGNED"
        datetime expiresAt
    }

    SimOrder {
        string id PK
        string orderNumber UK
        string msisdn
        string simType "PHYSICAL / ESIM"
        string kycStatus "PENDING / VERIFIED / REJECTED"
        string activationStatus "PENDING / ACTIVE / FAILED"
        string iccid
        string trackingNumber
    }

    PaymentTransaction {
        string id PK
        string transactionId UK
        string msisdn
        decimal amount
        string status "PENDING / SUCCESS / FAILED / REFUNDED"
        string gatewayReference UK
        string idempotencyKey UK
    }

    Order {
        string id PK
        string orderNumber UK
        string msisdn
        string type "SIM_PURCHASE / RECHARGE / BILL_PAYMENT / MNP"
        string status "PENDING / PROCESSING / COMPLETED / CANCELLED"
        decimal totalAmount
    }

    SupportTicket {
        string id PK
        string ticketNumber UK
        string msisdn
        string category "BILLING / NETWORK / SIM / GENERAL"
        string status "OPEN / IN_PROGRESS / RESOLVED / CLOSED"
        string priority "LOW / MEDIUM / HIGH / URGENT"
    }
```

---

## 6. Key Telecom Terms Simplified

| Term | What It Means | Why It Matters |
| :--- | :--- | :--- |
| **MSISDN** | Your standard mobile phone number (e.g. `2348012345678`). | Used as the subscriber's primary identity. |
| **IMSI** | International Mobile Subscriber Identity (inside the SIM chip). | Network identifier used by cellular towers. |
| **ICCID** | The 19-to-20 digit serial number printed on the physical SIM card or embedded in the eSIM chip. | Used to provision the line on the network HLR. |
| **BSS** | Business Support System (Optiva EPC). | The authoritative telecom engine for balances, data allowances, charging, and provisioning. |
| **HLR / HSS** | Home Location Register / Home Subscriber Server. | The cellular network core database that activates your SIM so it gets cellular signal. |
| **MNP** | Mobile Number Portability. | Regulatory feature that lets you switch carriers (e.g. MTN to TeleWyz) while keeping your phone number. |
| **NIN / KYC** | National Identity Number / Know Your Customer. | Mandatory Nigerian telecom regulation (NIMC / NCC) requiring biometric ID verification before any SIM can be activated. |
| **Idempotency** | Preventing duplicate charges if a user clicks "Pay" twice or their network reconnects. | If the same `Idempotency-Key` is sent, the server returns the previous result without charging again. |

---

## 7. How to Test Any Feature in 30 Seconds

1. Start the server:
   ```powershell
   npm start
   ```
2. Open your browser to the **interactive Swagger documentation**:
   👉 **`http://localhost:3000/api-docs`**
3. Pick any endpoint:
   - Click **Try it out**
   - Click **Execute**
   - View the live response instantly!

