# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary audience: external agribusiness — third-party producers, contractors, and agro companies** that adopt Agro Trazabilidad as a SaaS. The product is not positioned as an internal tool for a single group.

Within any adopting firm, the real product surfaces are the operating roles:
- Owner / administrator — full operation view: finances, task assignment, approvals, margins per firm.
- Administrative operator — fast invoice / receipt / waybill entry with reconciliation.
- Field operator — daily work parts and photos from the mobile app, on site, often without connectivity.
- Agronomist — phytosanitary prescriptions, doses per hectare, rotation planning.
- Audited client / producer — read-only panel to follow work, inputs, and certifications on their own lots.

## Product Purpose

Agro Trazabilidad unifies mapping, production, work parts, inputs, machinery, personnel, livestock, and finance into one platform with end-to-end traceability from the firm to the lot. Success means field data is captured once, at the source, and flows to the office and the client without parallel spreadsheets or double entry.

## Positioning

**The differentiators are offline-first field capture and end-to-end traceability (firm → field → lot → input).**
- Offline-first is an operating promise, not a nicety: the field operator records a work part on site with no signal, and the app syncs asynchronously when coverage returns. Field capture never depends on connectivity.
- Traceability binds every labor, input, and work part to the field and lot that produced it, across the whole operation.
- Multi-firm, multi-tenant data isolation is a **capability, not the positioning**; it must not lead the message.

## Operating Context

- Work happens in two worlds that must feel like one system: the field (mobile, one-handed, bright sun, intermittent or no connectivity) and the office (desktop, review and approval).
- The core loop is: capture in the field → approve in the office → audit and report at the client / owner level.
- Field proof is physical: a photo of the paper notebook can back a digital work part.
- Terminology is domain-specific and in Spanish (es-AR): parte diario, lote, labor, cuaderno, campaña, razón social, tranquera, hectáreas.

## Capabilities and Constraints

- Modules present: Mi Campo & Mapeo, Producción, Partes de trabajo, Insumos por cliente, Maquinaria & combustible, Gestión de personal, Ganadero de precisión. Finanzas multi-firma is in progress ("Próximamente").
- Offline-first mobile capture with asynchronous synchronization and a visible pending-sync state.
- Multi-tenant, multi-firm isolation with role-scoped access (owner / consolidated, operator / scoped, client / audit-only).
- **Constraint — no public pricing.** Pricing is handled off-site; no price appears on the site.
- **Decision — public read-only demo.** A publicly accessible, read-only demo surface (`/demo`) with seeded data and no authentication will stand behind the "explore the product" conversion path.
- **Open decision — real firm names.** The current landing names three real operating firms (Eliggi, Eliggi Tufoni, Eliggi Néstor). Whether to keep them on a public landing aimed at external adopters, reposition them as a reference case, or remove them is undecided.

## Brand Commitments

- Product name: **Agro Trazabilidad**.
- Voice: neutral, professional Spanish (es-AR) in product copy; domain-accurate, no marketing inflation.
- No invented testimonials, customers, benchmarks, or metrics; no pricing claims.

## Evidence on Hand

- A complete, implemented marketing landing at `src/app/page.tsx` describing real modules and roles.
- Real firm names referenced in the landing and login copy.
- **Absences future work must not fabricate:** no public customers beyond the referenced group, no testimonials, no case studies, no benchmarks, no pricing, no press.

## Product Principles

1. **Field first, connectivity last.** Design for the operator in the lot with no signal before the office with stable networks.
2. **Capture once, flow everywhere.** One field entry should reach the office and the client without re-entry.
3. **Traceability is the product, not a feature.** Every labor, input, and part is anchored to its field and lot.
4. **Differentiators lead, capabilities support.** Offline-first and traceability carry the message; multi-firm isolation and secondary modules support it.
5. **Speak the operator's language.** Spanish agro terminology over engineering jargon; plain benefit over "multi-tenant" ops-speak.
