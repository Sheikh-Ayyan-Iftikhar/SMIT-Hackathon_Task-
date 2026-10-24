# HCM Lite — Master Project Specification
## Saylani AI Hackathon | `spec.md`

## 1. Your Role

Act as a senior full-stack engineer, software architect, UI/UX designer, database engineer, security specialist, QA engineer, and AI integration engineer.

Your mission is to build **HCM Lite**, a production-minded, web-based Human Capital Management system that enables an HR team to manage the daily operations of a real company, with an AI assistant that answers questions using actual application data.

This is a real, data-driven application, not a static dashboard, UI-only prototype, or mock demonstration.

### Core principle

**No preloaded data. No dummy employees. No fabricated statistics. No fake AI answers.**

The application starts empty. An authorized Admin establishes the company, configures the workspace, and creates or authorizes HR access. HR then registers employees and performs the daily work that generates real application data.

Every number, chart, status, report, and AI answer must be derived from persisted records or explicitly identified calculations.

---

## 2. Mandatory Development Rules

1. Inspect the complete existing repository before changing anything.
2. Read the existing `spec.md`, `README`, package files, environment examples, database schema, application routes, and available tests.
3. Preserve working functionality and existing project conventions unless a change is necessary and justified.
4. Do not replace an existing application with a fresh scaffold without approval.
5. Do not add unnecessary dependencies or expose secrets in frontend code.
6. Never invent existing features, database tables, API endpoints, environment variables, or integrations.
7. Never seed demo employees, sample attendance, fake payroll, mock charts, or fictional company records.
8. Do not use hardcoded statistics as dashboard fallbacks.
9. Do not claim an integration works until it has been configured and tested.
10. Implement proper loading, empty, success, and error states.
11. Validate inputs on both the client and server where applicable.
12. Write and run relevant tests after implementation.
13. Keep the application responsive, accessible, maintainable, and secure.
14. Report blockers honestly instead of silently bypassing them.

### Strict approval gate

Work in the following phases:

- **Phase 0:** Repository inspection, requirements analysis, architecture proposal, and implementation plan only.
- **Phase 1:** Foundation, authentication, authorization, and company setup.
- **Phase 2:** Employee management and organizational structure.
- **Phase 3:** Attendance, leave management, and HR operations.
- **Phase 4:** Reports, dashboard calculations, and AI assistant.
- **Phase 5:** Integration testing, security review, accessibility, performance, and deployment readiness.

Start with Phase 0 only. Do not modify application code, install packages, run migrations, delete files, or begin implementation during Phase 0.

After presenting the Phase 0 report, stop and wait for explicit approval. After each subsequent phase, report results and wait for approval before continuing. Approval for one phase does not authorize later phases.

If the repository already contains part of the application, adapt the plan to its actual state rather than rebuilding completed work.

---

## 3. Product Vision

Build a lightweight, professional HR workspace that makes the following possible:

- Set up a company and its organizational structure.
- Securely manage HR users and employee records.
- Record and review employee attendance.
- Submit, approve, and reject leave requests.
- Track departments, job titles, and employment status.
- View accurate operational summaries and reports.
- Ask an AI assistant questions about authorized company data.
- Maintain an auditable history of important actions.

Prioritize a complete, demonstrable end-to-end workflow over a large number of unfinished modules.

---

## 4. User Roles and Permissions

Implement server-enforced role-based access control (RBAC).

### Admin

Admin is responsible for initializing and configuring the company workspace.

Capabilities:

- Complete initial company setup.
- Manage company-level settings.
- Create, invite, or authorize HR accounts.
- Assign and revoke appropriate roles.
- Manage departments and organization settings.
- View permitted company-wide summaries.
- Review relevant audit records.
- Configure supported integrations.

The initial Admin account must be established through a secure bootstrap or invitation flow. Never create a publicly accessible default administrator account or hardcoded credentials.

### HR

HR is responsible for day-to-day personnel operations.

Capabilities:

- Register employees.
- Create and maintain employee profiles.
- Assign departments and job titles.
- Record and review attendance.
- Review, approve, or reject leave requests according to permissions.
- View relevant HR reports.
- Ask the AI assistant questions about data they are authorized to access.

HR must not be able to grant themselves Admin privileges or modify restricted company settings.

### Employee

If an employee-facing portal is included in the approved scope, employees may:

- View their own permitted profile information.
- View their own attendance records.
- Submit leave requests.
- View the status and history of their leave requests.

Employees must not be able to access other employees' private records.

If self-service authentication cannot be completed within the agreed scope, keep the employee-facing experience out of the initial release rather than implementing insecure shortcuts.

### Authorization requirements

- Verify permissions on the server for every protected operation.
- Apply company-level data isolation to all relevant queries.
- Deny access by default.
- Do not trust role names or company IDs supplied by the browser.
- Prevent insecure direct object references.
- Protect against privilege escalation and unauthorized record modification.

---

## 5. First-Run Experience: Start Empty

A new installation must not contain fictional business data.

The initial workflow should be:

1. An authorized Admin opens the application.
2. The application presents an onboarding or setup screen.
3. Admin enters the real company name and required company settings.
4. Admin completes the initial workspace configuration.
5. Admin creates or invites HR users.
6. HR signs in and creates employee records.
7. HR configures departments, job titles, and applicable policies.
8. HR begins recording attendance and processing leave requests.
9. Dashboard metrics appear as real records are created.

Before setup, show an appropriate onboarding screen rather than a dashboard full of zeros presented as if operations are already underway.

After setup, show clear empty states such as:

- “No employees have been registered yet.”
- “No attendance records are available for this period.”
- “No leave requests have been submitted.”
- “No reports are available for the selected filters.”

Provide relevant next actions, such as “Add Employee” or “Configure Departments,” based on the signed-in user's permissions.

### Data integrity rules

- No sample employees or fabricated company records.
- No seeded attendance or leave requests.
- No hardcoded chart datasets.
- No synthetic counts in API responses.
- No fabricated AI responses presented as real data.
- Development and automated tests may create temporary fixtures in an isolated test environment, but must never insert those fixtures into the real application database.
- Failed database requests must display errors, not fallback statistics.
- Zero is a valid result only when the corresponding query succeeds and returns zero records.

---

## 6. Core Functional Modules

### 6.1 Company Setup

Implement:

- Company name and basic organization details.
- Supported timezone and locale settings.
- Configurable working days and standard working hours.
- Initial department setup.
- Secure HR account onboarding.
- Workspace setup status and completion indicators.

Validate required information and prevent duplicate initialization where the business rules prohibit it.

### 6.2 Employee Management

Provide an employee directory with:

- Search by employee name or employee ID.
- Filters by department, status, and other appropriate fields.
- Sorting and pagination.
- Employee detail views.
- Create, edit, view, and archive/deactivate workflows.
- Department and job-title assignments.
- Joining date and employment status.
- Appropriate validation and duplicate prevention.

Suggested employee fields:

- Employee ID generated or assigned according to a documented policy.
- Full name.
- Work email, where applicable.
- Phone number, if required.
- Department.
- Job title.
- Joining date.
- Employment status.
- Optional profile image.
- Created and updated timestamps.

Do not collect sensitive personal information unless it is necessary for an explicitly approved feature.

Define clear behavior for employee deactivation. Historical attendance, leave records, and audit records must remain consistent and must not disappear because an employee is deactivated.

### 6.3 Department and Organization Management

Implement:

- Department creation and editing.
- Department names and optional descriptions.
- Employee-to-department assignments.
- Department-level employee counts calculated from current records.
- Protection against invalid or orphaned relationships.

Define how department deletion behaves when employees are assigned to it. Prefer safe reassignment or deactivation over destructive cascading deletion of historical data.

### 6.4 Attendance Management

Provide a practical attendance workflow:

- Record attendance for a specific employee and date.
- Support relevant statuses, such as present, absent, late, and half-day, where appropriate.
- Record check-in and check-out times if the chosen workflow supports them.
- View daily and period-based attendance.
- Filter by employee, department, date, and status.
- Correct attendance records only through authorized actions.
- Preserve a history of significant corrections.

Define and enforce rules for:

- Duplicate attendance entries.
- Working days, weekends, and configured holidays.
- Timezone handling.
- Late-arrival calculations.
- Missing check-outs.
- Attendance corrections.
- Employee deactivation.

Do not automatically mark every employee absent when no attendance has been recorded unless a documented, explicit business rule supports that calculation. Distinguish missing records from confirmed absence.

### 6.5 Leave Management

Provide:

- Leave request submission.
- Leave type and date selection.
- Optional reason or supporting details.
- Request history.
- Pending, approved, rejected, and cancelled statuses where applicable.
- Authorized approval and rejection actions.
- Reviewer identity and timestamps.
- Leave balances only if a valid leave policy and sufficient transaction data exist.

Prevent invalid date ranges and unauthorized decisions. Prevent conflicting or duplicate requests according to documented rules.

Keep an audit trail for approval decisions.

Never invent leave balances. If policies have not been configured or historical data is insufficient, clearly indicate that balances are unavailable or not yet configured.

### 6.6 Dashboard and Reporting

Create a useful HR dashboard based exclusively on persisted application records.

Potential metrics include:

- Total active employees.
- Employees by department.
- New employees within a selected period.
- Attendance summaries for the selected date or period.
- Pending leave requests.
- Approved and rejected leave requests within a period.
- Recent authorized HR activity.

Every metric must have a defined formula, date range, timezone, and relevant filters.

For example:

- **Active employees:** count of employee records matching the application's documented active-status definition.
- **Pending leave requests:** count of requests whose current status is pending.
- **Department distribution:** active employee count grouped by department.
- **Attendance summary:** counts grouped by attendance status for the selected period, with missing records handled separately.

Use actual database aggregation or reliable server-side calculations. Never calculate authoritative metrics only from whatever rows happen to be loaded on the current frontend page.

Requirements:

- Clear date filters.
- Consistent calculation rules.
- Accurate empty states.
- Explicit loading and error handling.
- Charts that update when their underlying records change.
- No placeholder chart values.
- No misleading percentages when the denominator is zero or unavailable.

If no data exists, explain what the metric represents and how the user can generate the first real record.

### 6.7 Search, Filtering, and Navigation

Provide consistent navigation for authorized modules.

Implement:

- Global or module-level search where appropriate.
- Useful filtering and sorting.
- Pagination for larger datasets.
- Clear page titles and action buttons.
- Empty states that guide users to the next valid action.
- Helpful feedback after successful or failed operations.

Do not make navigation links appear functional if their destinations or workflows do not exist.

---

## 7. AI Assistant — Real Data Only

The AI assistant is a core feature of HCM Lite, not a decorative chatbot.

It must answer HR questions using actual persisted application data and the permissions of the signed-in user.

Example questions:

- “How many active employees do we currently have?”
- “Which department has the most active employees?”
- “How many leave requests are pending?”
- “Summarize attendance for the selected date.”
- “Which employees have no attendance record for this working day?”
- “How many employees joined this month?”
- “Summarize leave requests awaiting my review.”

These questions are examples of supported behavior, not prewritten answers. The assistant must calculate answers from current records.

### 7.1 Grounded answer pipeline

Implement the following conceptual pipeline:

1. Authenticate the current user.
2. Determine the user's authorized company and permissions.
3. Receive and validate the question.
4. Identify the information or supported calculation required.
5. Retrieve relevant data using approved server-side functions or queries.
6. Calculate metrics using deterministic business logic where appropriate.
7. Supply the AI model with the minimum necessary, authorized information.
8. Generate an answer grounded in the retrieved results.
9. Validate the response and display it with appropriate context.

Do not send unrestricted database credentials or privileged database access to the model.

### 7.2 Prevent fabricated answers

The assistant must:

- Never invent employee names, IDs, attendance, salaries, leave balances, or statistics.
- Never claim to have queried data when retrieval failed.
- Never present assumptions as confirmed facts.
- Distinguish zero results from missing or unavailable information.
- Explain when data is insufficient to answer.
- Ask a clarification question when a request is ambiguous.
- State the relevant date or period for time-dependent answers.
- Use the configured company timezone when interpreting dates.
- Respect permissions and company-level data isolation.
- Avoid exposing unnecessary personally identifiable information.

If there are no employee records, an appropriate answer is:

“There are currently no employee records in the system, so I cannot provide an employee count yet. Register employees first to generate this metric.”

If a database query fails, the assistant must say that the information could not be retrieved. It must not invent a likely answer.

### 7.3 Safe AI architecture

Prefer a controlled tool/function-calling architecture with explicitly permitted operations, for example:

- `get_employee_summary`
- `get_department_summary`
- `get_attendance_summary`
- `get_pending_leave_requests`
- `get_leave_summary`
- `get_recent_hr_activity`

These are proposed interfaces. Inspect the existing codebase and select an appropriate implementation rather than assuming these functions already exist.

Each operation must:

- Validate its inputs.
- Derive company scope from authenticated server context.
- Apply authorization checks.
- Use parameterized queries or the relevant safe database client.
- Return only the fields necessary for the request.
- Handle errors and unavailable data explicitly.
- Avoid exposing internal credentials or unrestricted database operations.

Do not allow the model to generate and execute arbitrary SQL, bypass application authorization, or modify records through unrestricted tools.

The initial assistant should be read-only. If AI-powered actions are added later, require explicit confirmation, recheck permissions, and validate the action on the server before execution.

### 7.4 AI integration and fallback

Inspect the repository before selecting an AI provider. Reuse an existing supported integration if appropriate.

If no provider has been configured:

- Implement the secure integration boundary.
- Document the required environment variables.
- Add setup instructions.
- Show a clear configuration error in the UI.
- Do not pretend that a mock chatbot is a real AI integration.

Never expose AI provider keys in client-side bundles, public repositories, logs, or API responses.

If the AI provider is unavailable, the rest of the HR application should continue working normally.

### 7.5 AI answer quality

Where useful, answers should include:

- A direct response.
- The date range used.
- The relevant filters.
- The number of records considered.
- A short explanation of the calculation.
- A link to the relevant HR module, if supported.

Only include these details when they are grounded in actual query results.

---

## 8. Technical Architecture

### Repository-first stack selection

Do not assume a particular stack before inspecting the repository.

If an application already exists, preserve its working stack and architecture unless there is a clear technical reason to change them.

If the repository is empty, propose a maintainable architecture appropriate for a small, full-stack hackathon application. Explain the trade-offs before requesting approval.

The architecture must support:

- A responsive frontend.
- Server-side authentication and authorization.
- Persistent database storage.
- Secure business logic.
- An AI provider integration boundary.
- Schema migrations or an equivalent repeatable database setup process.
- Automated tests.
- Production deployment.

### Architecture principles

- Separate presentation, business logic, and data access.
- Reuse components and validation logic.
- Keep database queries and privileged operations on trusted server-side boundaries.
- Use typed contracts where appropriate for the selected stack.
- Centralize business rules that affect calculations.
- Avoid duplicated formulas across dashboard cards, reports, and AI tools.
- Use transactions when multiple database changes must succeed together.
- Provide useful, safe error messages.
- Document important architectural decisions.

Do not introduce a complex microservice architecture unless the existing project genuinely requires it.

---

## 9. Database and Data Integrity

Design a normalized schema appropriate to the approved feature set.

Potential entities include:

- Companies or workspaces.
- User accounts and memberships.
- Roles and permissions.
- Departments.
- Employees.
- Attendance records.
- Leave types and policies.
- Leave requests.
- Audit events.

These are conceptual entities, not instructions to create duplicate tables if equivalent structures already exist.

### Required safeguards

- Primary keys and appropriate foreign keys.
- Unique constraints for applicable identifiers.
- Required-field and domain validation.
- Appropriate indexes for frequent queries.
- Explicit handling of deletion and deactivation.
- Consistent timestamps.
- Company-level scoping.
- Transaction-safe business operations.
- Repeatable schema migrations.
- A documented backup and recovery approach appropriate to the deployment.

Never expose service-role credentials or database administrator credentials to the browser.

If using Supabase, inspect the existing project and configure appropriate Row Level Security (RLS) policies in addition to application-level authorization. Do not assume that merely enabling RLS is sufficient; test the policies against each role and operation.

Do not perform destructive migrations or delete existing records without explicit approval and a recovery plan.

---

## 10. Security and Privacy

Treat employee information as private business data.

Implement, where applicable:

- Secure authentication and session management.
- Server-enforced RBAC.
- Company-level isolation.
- Safe password and invitation flows through a suitable authentication provider.
- Input validation and output encoding.
- Protection against common injection and access-control vulnerabilities.
- Rate limiting for sensitive endpoints and AI requests.
- Appropriate CSRF protections for the chosen authentication architecture.
- Safe handling of authentication errors.
- Secret management through environment variables.
- Minimal logging of personal information.
- Audit logging for sensitive operations.
- Safe handling of file uploads if profile images or documents are supported.

Do not log passwords, session tokens, provider keys, or unnecessary employee information.

Audit events should capture relevant actions, actor, target record, timestamp, and appropriate before/after details when justified. Avoid storing secrets or unnecessary sensitive content in audit logs.

Never trust frontend-only authorization.

---

## 11. UI/UX and Visual Quality

Create a professional HR workspace with a coherent design system.

### Visual direction

- Clean, modern, premium SaaS interface.
- Clear information hierarchy.
- Consistent typography and spacing.
- Restrained use of colors.
- Readable tables and forms.
- Well-designed navigation.
- Useful icons and meaningful status indicators.
- Subtle, purposeful animations.
- Consistent cards and data visualizations.

Avoid excessive gradients, distracting animations, decorative 3D effects, and visual clutter that reduce usability.

### Required screens

Implement the applicable screens according to the approved scope:

1. Authentication.
2. Initial company setup.
3. Main dashboard.
4. Employee directory.
5. Employee creation and editing.
6. Employee details.
7. Department management.
8. Attendance management.
9. Leave requests and approvals.
10. Reports.
11. AI assistant.
12. Company settings and HR user management.
13. Access-denied and not-found pages.

### UX requirements

- Responsive layouts for desktop, tablet, and mobile.
- Semantic HTML.
- Keyboard-accessible navigation and controls.
- Visible focus indicators.
- Accessible form labels and validation messages.
- Sufficient color contrast.
- Reduced-motion support.
- Clear loading, empty, success, and failure states.
- Confirmation for destructive or consequential actions.
- No fake buttons, dead links, or decorative controls presented as functional features.

Follow WCAG 2.2 AA principles where reasonably applicable.

---

## 12. Testing and Acceptance Criteria

Create tests that verify real behavior rather than merely checking whether a page renders.

### Functional tests

Verify that:

- A new workspace starts without business records.
- Unauthorized users cannot initialize or administer a company.
- Admin can complete the approved setup workflow.
- HR cannot grant themselves Admin permissions.
- Authorized HR users can register and edit employees.
- Duplicate employee identifiers are rejected.
- Employee deactivation preserves relevant historical records.
- Attendance records obey the defined uniqueness and validation rules.
- Leave requests follow the documented status transitions.
- Unauthorized users cannot read or modify restricted records.
- Dashboard metrics match the underlying database records.
- Filters and date ranges produce consistent results.
- Failed database requests do not produce fake metrics.
- The AI assistant answers from retrieved records.
- The AI assistant does not fabricate records when data is missing.
- The AI assistant respects role permissions and company boundaries.
- AI provider failure is handled gracefully.
- Audit records are created for the actions that require them.

### Security tests

Test cross-company access attempts, unauthorized record IDs, privilege escalation, invalid input, protected routes, and any relevant RLS policies.

### UI tests

Verify major workflows on desktop and mobile layouts, including empty states, validation errors, loading states, and accessibility basics.

### Testing data policy

Use isolated test fixtures for automated tests only. Clean up test data reliably and never expose it as real company information.

### Required validation

Run the appropriate commands for the discovered project:

- Dependency/build validation.
- Linting and type checking, where configured.
- Unit tests.
- Integration tests.
- Relevant end-to-end tests.
- Database migration checks.
- Production build.
- Deployment configuration checks.

Do not claim that tests passed unless they were actually run and the results support that claim.

---

## 13. Environment and Deployment

Inspect the existing deployment configuration and document the required settings.

Provide an `.env.example` containing variable names and safe placeholders only.

Document:

- Database configuration.
- Authentication configuration.
- AI provider configuration.
- Required public environment variables.
- Server-only secrets.
- Migration and setup commands.
- Local development instructions.
- Production build instructions.
- Deployment steps.
- Initial Admin bootstrap procedure.
- Troubleshooting for missing configuration.

Never overwrite an existing `.env` file, leak credentials, or commit secrets.

The application should start successfully when correctly configured and should display actionable errors when required services are unavailable.

Do not claim the application is deployed, the database is connected, or the AI is operational without verifying each claim.

---

## 14. Performance and Maintainability

- Use pagination for large employee and attendance lists.
- Avoid unnecessary database queries.
- Use server-side aggregation for authoritative metrics.
- Add indexes based on query patterns.
- Avoid repeated API calls when existing data can be reused safely.
- Keep AI context limited to the information required for the question.
- Use reusable components and consistent naming.
- Avoid unnecessary dependencies.
- Remove dead code only when its removal is safe and justified.
- Keep documentation synchronized with the actual implementation.

Optimize for reliable daily HR work rather than premature complexity.

---

## 15. Required Documentation

Maintain documentation appropriate to the existing repository.

At minimum, provide or update:

- `spec.md` — this master specification and any approved amendments.
- `README.md` — project overview, setup, features, and commands.
- `.env.example` — safe configuration template.
- Database schema and migration documentation.
- Architecture and permission notes.
- AI integration and data-grounding documentation.
- Testing instructions.
- Deployment and Admin bootstrap instructions.

Do not overwrite useful existing documentation without preserving relevant content.

---

## 16. Phase 0 Deliverables — Inspection Only

Your first response must contain a repository inspection report with:

1. **Project inventory:** Existing folders, application entry points, package manager, dependencies, and framework.
2. **Current implementation:** What already works and what is incomplete.
3. **Database assessment:** Existing schema, authentication setup, data isolation, and migrations.
4. **AI assessment:** Existing AI integrations, environment configuration, and data-access boundaries.
5. **Security gaps:** Concrete risks identified from the repository.
6. **Requirements mapping:** A table mapping each major requirement to existing functionality, missing work, or a blocker.
7. **Proposed architecture:** A design based on the actual repository.
8. **Phased implementation plan:** Specific files or modules likely to change, dependencies between tasks, and test strategy.
9. **Configuration blockers:** Missing environment values, credentials, provider setup, or external permissions.
10. **Acceptance plan:** Verifiable criteria for deciding whether each phase is complete.

Distinguish verified findings from assumptions. Never invent findings about files you have not inspected.

**Stop after presenting this report. Wait for explicit approval before implementing Phase 1.**

---

## 17. End-of-Phase Reporting

At the end of every approved phase, provide:

### Completed
- Features and workflows implemented.
- Relevant files and database changes.
- Requirements satisfied.

### Verification
- Commands actually executed.
- Tests passed and failed.
- Build and lint results.
- Security checks completed.

### Remaining work
- Known limitations.
- Unresolved bugs.
- Missing credentials or external configuration.
- Requirements deferred to a later phase.

### Demonstration
- Exact steps to demonstrate the completed workflows.
- Expected results based on actual application state.

### Approval gate
State which phase is complete, identify the next proposed phase, and stop for approval.

Never silently continue into the next phase.

---

## 18. Definition of Done

HCM Lite is ready for hackathon demonstration when the implemented and approved scope satisfies these conditions:

- A fresh installation contains no fictional business records.
- Admin can initialize a company through the secure setup workflow.
- HR can create and manage real employee records.
- Authorized users can perform the implemented HR workflows.
- Data persists correctly in the configured database.
- Dashboard metrics and reports match actual records.
- The AI assistant answers supported questions using real, authorized data.
- Missing data, unavailable services, and failed queries are handled honestly.
- Access controls and relevant database policies have been tested.
- Core workflows pass the applicable automated tests.
- The production build succeeds.
- The setup and demonstration instructions are accurate.
- Known limitations are documented rather than hidden.

Do not declare the whole project complete merely because the UI looks finished.

---

## Final Instruction

Begin with **Phase 0: Repository Inspection and Planning Only**.

Read this entire specification, inspect the repository, identify the actual project state, and prepare the required report.

Do not start coding, install packages, change database schemas, generate dummy records, or execute implementation phases until the user explicitly approves the relevant phase.

The objective is a reliable, secure, fully functional **HCM Lite** application whose HR workflows, metrics, and AI answers are grounded in real application data.
