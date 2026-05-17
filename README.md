# Fluentia Backend

NestJS REST API for an English learning platform — placement testing, student roster, groups, payments, and admin tooling.

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | NestJS 11 |
| ORM | TypeORM 0.3 + PostgreSQL |
| Auth | Passport JWT (+ anonymous strategy) |
| Validation | class-validator / class-transformer |
| API Docs | Swagger / OpenAPI (`/docs`) |
| Mail | Nodemailer + Handlebars templates |
| i18n | nestjs-i18n (en, ar, es, fr, hi, uk, zh) |
| File storage | Local disk or AWS S3 / S3-presigned |
| Linting | ESLint + Prettier |
| Testing | Jest + Supertest |

## Project Structure

```
src/
├── admin/            # Admin controllers + services (dashboard, students, groups, placement, hub)
├── auth/             # JWT auth, strategies, social login
├── files/            # File upload (local / S3)
├── mail/             # Transactional email
├── payments/         # Payment records and student self-pay
├── placement/        # Placement test aggregate + embedded questions
├── student-answers/  # Per-answer correctness rows
├── student-groups/   # Group entity
├── student-hub/      # Student-facing controllers (hub, shift, placement submit)
├── users/            # User entity + service
└── utils/            # Shared helpers and interceptors
```

Each e-learning domain follows a three-layer layout:

```
domain/           ← pure models / business types
dto/              ← request & response contracts (class-validator)
infrastructure/
  persistence/    ← TypeORM entities, repositories
```

## Roles and Permissions

| Role | Access |
|---|---|
| **Admin** | Full roster, groups, placement workspace, dashboard, hub bundle |
| **Tutor** | Reserved for future workflows |
| **Student** | Hub summary, placement exam + submit, shift preference, self-pay |

All admin routes require `AuthGuard('jwt') + RolesGuard + @Roles(RoleEnum.admin)`.  
Student routes require `AuthGuard('jwt') + RolesGuard + @Roles(RoleEnum.student)`.

## API Reference (v1)

All routes are prefixed `/api/v1/...`. The full interactive spec is available at `/docs` when the server is running.

### Auth — `POST /api/v1/auth/...`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/email/register` | Register new account |
| POST | `/auth/email/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me` | Update own profile |
| DELETE | `/auth/me` | Delete own account |
| POST | `/auth/logout` | Invalidate session |

### Admin — `GET/POST/PATCH/DELETE /api/v1/admin/...`

| Method | Path | Description |
|---|---|---|
| GET | `/admin/me` | Signed-in admin display name + role |
| GET | `/admin/hub` | Bundle: dashboard + students + groups + placement |
| GET | `/admin/dashboard` | KPIs + chart series (optional `?from=&to=`) |
| GET | `/admin/students` | Full student roster |
| GET | `/admin/students/:studentId` | Single student |
| POST | `/admin/students` | Create student (provisions login) |
| PATCH | `/admin/students/:studentId` | Update student fields (name, email, group, notes, shift, password, next payment) |
| PATCH | `/admin/students/:studentId/status` | Toggle active / inactive |
| DELETE | `/admin/students/:studentId` | Soft-delete student |
| GET | `/admin/groups` | All groups |
| GET | `/admin/groups/:groupId` | Single group |
| POST | `/admin/groups` | Create group |
| PATCH | `/admin/groups/:groupId` | Update group |
| DELETE | `/admin/groups/:groupId` | Delete group |
| GET | `/admin/placement` | Placement workspace (metadata + all questions) |
| POST | `/admin/placement/questions` | Add question (`single` / `multi` / `text`) |
| PATCH | `/admin/placement/questions/:questionId` | Update question |
| DELETE | `/admin/placement/questions/:questionId` | Delete question |

### Student — `GET/PATCH /api/v1/student/...`

| Method | Path | Description |
|---|---|---|
| GET | `/student/hub` | Hub: placement summary, group, payments, shift |
| GET | `/student/placement` | Load placement exam (questions without answers) |
| PATCH | `/student/shift` | Update own shift (`morning` / `evening`) |
| POST | `/placement/:placementId/submit` | Submit all placement answers, returns score |

### Payments — `/api/v1/payments/...`

| Method | Path | Description |
|---|---|---|
| GET | `/payments` | All payments (admin) |
| POST | `/payments` | Create payment (admin) |
| GET | `/payments/:id` | Single payment |
| PATCH | `/payments/:id` | Update payment |
| DELETE | `/payments/:id` | Delete payment |
| GET | `/payments/my` | Student's own payment history |
| POST | `/payments/my` | Student self-pay |

## Response Shape Reference

Sample JSON shapes for each hub response live in `docs/`:

```
docs/
├── admin hub/
│   ├── admin-me.json          # GET /admin/me
│   ├── admin-hub-bundle.json  # GET /admin/hub
│   ├── dashboard.json         # GET /admin/dashboard
│   ├── admin-students.json    # GET /admin/students
│   ├── groups.json            # GET /admin/groups
│   └── questions.json         # GET /admin/placement
└── student hub/
    └── student-hub.json       # GET /student/hub
```

## Data Notes

- Placement test is a **single aggregate** row — metadata and all questions are stored together (`questions` JSONB column).
- Placement submit grades each answer immediately and writes `student_answer` rows; score is recomputed on read.
- Student objects carry a `shift` field (`morning` | `evening`) set by the admin or by the student via `PATCH /student/shift`.
- `amount` / `nextPaymentAmount` are stored as `integer` (whole currency units). Migrate to `numeric(10,2)` if decimal precision is required.
- Seeders follow an `ensure*` idempotent pattern — safe to re-run.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp env-example-relational .env
```

Key variables:

```
APP_PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgrespass
DATABASE_NAME=postgres
FILE_DRIVER=local          # or "s3" / "s3-presigned"
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Run migrations + seed

```bash
npm run migration:run
npm run seed:run:relational
```

Or in one step:

```bash
npm run db:migrate-and-seed
```

### 5. Start dev server

```bash
npm run start:dev
```

API available at `http://localhost:3000/api/v1`  
Swagger UI at `http://localhost:3000/docs`

## Database Lifecycle

```bash
# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/<Name>

# Apply pending migrations
npm run migration:run

# Rollback last migration
npm run migration:revert

# Re-seed (idempotent)
npm run seed:run:relational
```

## Quality Checks

```bash
# Lint
npm run lint

# Type-check + compile
npm run build

# Unit tests
npm run test

# E2E tests (requires running DB)
npm run test:e2e
```

## Seeded Test Users

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `secret` |
| Tutor | `jane.tutor@example.com` | `secret` |
| Student | `john.student@example.com` | `secret` |
