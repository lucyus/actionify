# Contributing to Actionify

Thank you for your interest in contributing to **Actionify**! This guide explains how to report issues, suggest features, submit code, and follow our development workflow.

## Table of Contents

* [1. Code of Conduct](#1-code-of-conduct)
* [2. How to Contribute](#2-how-to-contribute)
  * [2.1. Reporting Bugs](#21-reporting-bugs)
  * [2.2. Suggesting Features](#22-suggesting-features)
  * [2.3. Submitting Code Changes](#23-submitting-code-changes)
* [3. Getting Started](#3-getting-started)
  * [3.1. Prerequisites](#31-prerequisites)
  * [3.2. Installation](#32-installation)
  * [3.3. Running the Project](#33-running-the-project)
* [4. Development Workflow](#4-development-workflow)
  * [4.1. Branching Strategy](#41-branching-strategy)
  * [4.2. Commit Messages](#42-commit-messages)
  * [4.3. Tests and Coverage](#43-tests-and-coverage)
* [5. Submitting Pull Requests](#5-submitting-pull-requests)
  * [5.1. Before Submitting](#51-before-submitting)
  * [5.2. Pull Request Guidelines](#52-pull-request-guidelines)
  * [5.3. Review Process](#53-review-process)
* [6. Style Guides](#6-style-guides)
  * [6.1. Code Style](#61-code-style)
  * [6.2. Documentation Style](#62-documentation-style)
* [7. License](#7-license)


## 1. Code of Conduct

Help us maintain a welcoming and inclusive community by following our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.


## 2. How to Contribute

### 2.1. Reporting Bugs

1. Check [existing issues](https://github.com/lucyus/actionify/issues) first
2. If new, [open an issue](https://github.com/lucyus/actionify/issues/new) with:
  * Actionify version(s) involved
  * OS and version
  * Node.js version
  * Minimal reproduction steps
  * Actual behavior
  * Expected behavior
  * Screenshots, GIFs or error logs if relevant

### 2.2. Suggesting Features

* [Open a new issue](https://github.com/lucyus/actionify/issues/new) describing:
  * Feature purpose
  * Use cases & benefits
  * Optional screenshots, GIFs or mockups
* Optionally, implement it yourself and [submit a Pull Request](https://github.com/lucyus/actionify/pulls) following our [PR Guidelines](#5-submitting-pull-requests)

### 2.3. Submitting Code Changes

1. Work on an [existing issue](https://github.com/lucyus/actionify/issues) (look for [good first issues](https://github.com/lucyus/actionify/contribute) if you are new).
2. Fork the repository and set up your development environment (see [Getting Started](#3-getting-started)).
3. Create a branch from `master` following [branching rules](#41-branching-strategy).
4. Write code and documentation according to our [style guides](#6-style-guides).
5. Test your changes manually (see [Tests and Coverage](#43-tests-and-coverage)).
6. [Submit a Pull Request](#5-submitting-pull-requests).

## 3. Getting Started

### 3.1. Prerequisites

* 20+ GB of free disk space
* [Windows 10](https://www.microsoft.com/software-download) or higher
* [Node.js](https://nodejs.org/en/download) 16 or higher
* [Docker](https://docs.docker.com/get-docker)
* [Git](https://git-scm.com/install)


### 3.2. Installation

1. Configure [Docker Desktop](https://www.docker.com/products/docker-desktop):
    * Go to `Settings` > `Docker Engine`
    * [Add DNS](https://docs.docker.com/reference/cli/dockerd/#daemon-dns-options): `"dns": ["8.8.8.8"]`
    * Apply changes
    * In system tray, right click on Docker icon
    * Select `Switch to windows containers...`
2. Setup the project:
    * Open your favorite [Terminal](https://aka.ms/terminal)
    * Clone the repository: `git clone https://github.com/lucyus/actionify.git`
    * Navigate to the project directory: `cd actionify`
    * Build the project image: `npm run docker:build:image`
    * Create the project container: `npm run docker:build:container`

### 3.3. Running the Project

* To build project files:
  1. Start container: `npm run docker:start:container`
  2. Attach to container: `npm run docker:attach:container`
  3. Build project files: `npm run build`
  4. Exit from container: `exit`

* To run locally:
  1. Make sure container is not running: `npm run docker:stop:container`
  2. Copy build files to the host: `npm run docker:copy:project-build`
  3. Import the built version of Actionify in your JavaScript test file: `const { Actionify } = require("./lib");`
  4. Write your test script as you would normally use Actionify
  5. Run your test file: `node test.js`

> Note: Actionify features are not fully available inside containers due to OS security restrictions, which is why we recommend running Actionify locally.


## 4. Development Workflow

### 4.1. Branching Strategy

* Always branch from `master`
* Branch name: `<type>/issue-<number>` (e.g. `feat/issue-123`, `fix/issue-456`)
* Use [Conventional Commits types](https://www.conventionalcommits.org/)

### 4.2. Commit Messages

* Follow [Conventional Commits](https://www.conventionalcommits.org/)

### 4.3. Tests and Coverage

No automated tests yet; manual testing required:
* [Build project](#33-running-the-project) without errors
* Test your changes
* Avoid regressions
* Ensure OS and Node.js compatibility

## 5. Submitting Pull Requests

### 5.1. Before Submitting

* [Branch name is correct](#41-branching-strategy)
* [Commits follow guidelines](#42-commit-messages)
* [Code & Documentation follow style](#6-style-guides)
* [Code is tested thoroughly](#43-tests-and-coverage)
* Changes are focused and atomic

### 5.2. Pull Request Guidelines

* Clear, descriptive title
* Reference related issues
* Describe changes and choices
* Include screenshots/GIFs if helpful

### 5.3. Review Process

* Maintainers review PRs promptly
* Address feedback in a timely manner; inactive PRs will be closed
* Keep your branch up-to-date with `master`


## 6. Style Guides

### 6.1. Code Style

* Follow existing code patterns
* TypeScript: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
* C++: [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)

### 6.2. Documentation Style

* Use JSDoc for public & internal APIs
* Update [user documentation](./docs/) for new features

## 7. License

By submitting a contribution to this project, you agree that:
1. Your contribution will be licensed under the [Apache License 2.0](./LICENSE).
2. You have the rights to submit your contribution under that license.
3. You grant the project's original author(s) and any successors a perpetual, worldwide, non-exclusive, royalty-free right to:
  * Use, modify, and distribute your contribution under [Apache 2.0](./LICENSE) (or any compatible open-source licenses); and
  * Offer your contribution under a separate license for commercial use, including dual-licensing arrangements.
4. Your contribution will remain available under [Apache 2.0](./LICENSE) for open-source use, regardless of any separate commercial licensing.
