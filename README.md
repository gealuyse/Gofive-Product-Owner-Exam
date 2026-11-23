# Performance Studio MVP

An interactive performance review prototype for the Gofive Product Owner Exam. The demo includes fictional employees and can switch between English and Thai.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL shown by Vite. Use the role selector to try HR Admin, Manager, and Employee.

- **HR Admin** creates review cycles, assigns reviewers, and approves and publishes results.
- **Manager** reviews proposed goals and evidence, rates performance, and submits the review to HR.
- **Employee** proposes goals, adds evidence, and views published results.

Demo changes and attachments are stored in the current browser. Reset sample data in the sidebar to restore the original scenario.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

The production build is generated in `dist/`.
