# Comparing the rules with professional dashboard work

2026-10-31. Before 0.5.0 we checked the rules against high-rated dashboard designs on Dribbble and Behance: what the
strongest work does consistently, and whether any rule contradicts it.

## Method

- Dribbble: search "saas dashboard", sorted by Popular; 12 shots viewed at full size.
- Behance: search "saas dashboard" in UI/UX; 4 case studies viewed (cover screens).
- For each design we noted page and card structure, stat cards, charts, tables, colour use, buttons, shadows and copy.
- A pattern became a rule only when the strongest designs shared it and it holds for screens people work in, not only
  for a still image.

Designs viewed (titles as published):

| Source | Design |
|---|---|
| Dribbble | [Finexy – Finance SaaS Dashboard](https://dribbble.com/shots/26723736-Finexy-Finance-SaaS-Dashboard-Design) |
| Dribbble | [SaaS Dashboard for Business Payments](https://dribbble.com/shots/25270785-SaaS-Dashboard-for-Business-Payments-Web-Application) |
| Dribbble | [Foudora – SaaS Dashboard](https://dribbble.com/shots/26758172-Foudora-SaaS-Dashboard) |
| Dribbble | [SaaS Dashboard (recruiting rounds)](https://dribbble.com/shots/26229332-SaaS-Dashboard) |
| Dribbble | [Sugar CRM – SaaS Dashboard](https://dribbble.com/shots/26629031-Sugar-CRM-SaaS-Dashboard-UX-UI-Design) |
| Dribbble | [AI Data Analytics SaaS Dashboard](https://dribbble.com/shots/27240877-AI-Data-Analytics-SaaS-Dashboard) |
| Dribbble | [AI Workflow Automation SaaS Dashboard – Synthex](https://dribbble.com/shots/27380455-AI-Workflow-Automation-SaaS-Dashboard-UI-Design-Synthex) |
| Dribbble | [CRM SaaS Dashboard Design](https://dribbble.com/shots/26848851-CRM-SaaS-Dashboard-Design) |
| Dribbble | [E-Commerce Analytics – SaaS Dashboard](https://dribbble.com/shots/23209490-E-Commerce-Analytics-SaaS-Dashboard) |
| Dribbble | [FlowMail – Email Marketing Automation](https://dribbble.com/shots/27506601-FlowMail-Email-Marketing-Automation-SaaS-Dashboard-UIUX-Design) |
| Dribbble | [B2B SaaS Dashboard – Relay](https://dribbble.com/shots/27460216-B2B-SaaS-Dashboard-UX-Design-Relay) |
| Dribbble | Trading dashboard (MoonBucks), from the same search |
| Behance | Keel — Fintech SaaS Dashboard, UX UI Case Study |
| Behance | Nova Analytics — SaaS & UX UI Design Dashboard |
| Behance | Meridian — AI Contract Intelligence Platform |
| Behance | Vexto — Incident Response Desktop App |

## What the strongest work shared

Frequencies are from one reading of the screens, not a measured study.

| Pattern | How often | Rule |
|---|---|---|
| Stat card read top to bottom: muted label, large value, change with its period ("+1.5% vs last month") | most designs with stat cards | `stat-card-anatomy` (new), `numbers-with-context` |
| Same card header everywhere: title left, one control right (period, See all, ⋯) | nearly all | `card-header-pattern` (new) |
| Charts: inactive bars or series light grey, one highlighted in the accent with its value on the chart | most (Foudora, CRM SaaS, FlowMail, Keel) | `chart-highlight-one` (new), `direct-labels` (new) |
| Light page background, white or raised cards, almost no shadow | nearly all | `no-heavy-card-shadow` (new) |
| Flat primary buttons; one filled action in the page header | most | `no-gradient-buttons` (new), `one-primary-action` (new) |
| Status as a small tinted pill with a dot, the same colour per status | most designs with tables | `status-system` (new) |
| Hero number with cents or decimals dimmed ($422,525.**82**) | Keel, Vexto | `dim-secondary-digits` (new) |
| One accent colour, used on few elements | most | `one-accent` |
| One line icon set at one size | all | `icons-not-emoji` |
| Plausible data with real-looking names and logos | nearly all | `no-placeholder-data` |

## Where Dribbble itself shows the tells

Popular is not the same as good for a working screen. Among the 16 designs:

- 8 open with a greeting ("Welcome back, Sujon 👋", "Good morning"): 7 of the 12 Dribbble shots and 1 of the 4
  Behance case studies. We kept `no-greeting-headline`: the title line is the most valuable line of a screen you open every
  day.
- Gradient buttons appeared on AI features ("Get AI Insight", "Open AI Assistant") and a sparkle marked AI. We kept
  `no-sparkle-for-ai` and added `no-gradient-buttons`.
- Rainbow donut charts with five or six hues appeared in the weaker shots. This became `chart-highlight-one`.
- Small uppercase sidebar group labels ("MAIN MENU") are common. We kept `no-decorative-uppercase`; the stronger shots
  used sentence case or no group labels.

## Not adopted

- Large radii everywhere (20 px and up on every card): a style choice, not a rule; `radius-scale` only asks for one
  scale.
- Device mock-ups and hands holding tablets: presentation of the shot, not of the product.
