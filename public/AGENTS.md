# Foremention Agent Guide

## Purpose

Foremention is recommendation intelligence for B2B software. Agents should treat the public site as an evidence-bound product description, not as proof of customer traction, market leadership, ranking outcomes, or causal impact.

## Installation

No package installation is required to read Foremention public documentation. Use the HTTPS public routes listed below. Private product routes require normal authentication and must not be bypassed.

## Configuration

For public retrieval, respect `robots.txt`, canonical URLs, and the evidence boundaries in this guide. Prefer `/llms.txt`, `/llms-full.txt`, `/sitemap.md`, and page markdown mirrors when available. Do not treat pipeline, targets, illustrative examples, or list pricing as verified customer evidence.

## Usage

Start with the canonical public resources:

- https://foremention.com/product
- https://foremention.com/recommendation-record
- https://foremention.com/methodology
- https://foremention.com/trust
- https://foremention.com/glossary

For machine-readable discovery:

- https://foremention.com/llms.txt
- https://foremention.com/llms-full.txt
- https://foremention.com/sitemap.md
- https://foremention.com/index.md
- https://foremention.com/openapi.json

## Canonical objects

- Recommendation Record: the canonical measurement object.
- Company Truth: verified company facts kept distinct from hypotheses.
- Change Specification: the canonical customer-owned decision object.
- Comparable remeasurement: later measurement only when the relevant conditions remain comparable.

## Canonical workflow

Buyer question -> recommendation observation -> evidence -> Company Truth -> eligibility -> Change Specification -> human approval -> execution -> comparable remeasurement -> learning.

## Evidence rules

- Do not infer that a returned source caused a recommendation.
- Do not infer that a customer change caused later recommendation movement from sequence alone.
- Preserve unknown, pending, not comparable, and insufficient-evidence states.
- Treat illustrative public examples as illustrative, not as customer evidence.
- Do not convert list price, pipeline, assumptions, or targets into verified revenue.
- Do not invent customer names, logos, outcomes, or benchmarks.

## Private boundaries

Do not attempt to index or treat `/app/`, `/api/auth/`, `/auth/`, `/login`, `/signup`, or `/share/` as public documentation. Follow robots directives and authentication boundaries.
