// Generates migrations/0002_seed.sql from the CV/profile/templates below.
// CV content is taken verbatim from the public portfolio (index.html), which mirrors the CV.
import { writeFileSync } from "node:fs";

const RESUME = "https://drive.google.com/file/d/1ACPjZhiIYcgitplyWxg_eET2D3AE84V-/view";

export const cv = {
  header: {
    name: "Ravi Ranjan Kumar",
    title: "Data Analyst · CRM Automation Specialist · Business Operations",
    email: "ravikumar.inbh@gmail.com",
    phone: "+91 8851015209",
    location: "New Delhi, India",
    linkedin: "https://www.linkedin.com/in/ravi-ranjan-data-analyst/",
    github: "https://github.com/RaviRanjanKumar-DA",
    portfolio: "https://raviranjankumar-da.github.io/portfolio/"
  },
  summary:
    "Results-driven Data & Business Operations Analyst with 5+ Years of Professional Experience (including 3+ Years as a dedicated Data Analyst) spanning CRM management, workflow automation, business intelligence, and sales operations. Proven track record of designing and delivering 100+ interactive dashboards across Power BI, Metabase, Tableau & Looker Studio — automating reporting pipelines and driving a 40% improvement in sales team productivity through strategic CRM implementation. Adept at leveraging n8n, Pabbly, Claude AI, and SQL to deliver measurable business impact.",
  experience: [
    {
      title: "Data Analyst", company: "The Batraa Numerology", location: "New Delhi, India", client: "",
      start: "May 2025", end: "Present",
      bullets: [
        "Spearhead end-to-end lead management operations for Sales & Business Development teams across multi-product lines: Elite Diamond, Business Software, Vastu Platinum, Akashic Awakening, Logo Consultation & Ratnakrit e-commerce (crystals, rudraksha, bracelets, Dhan Varsha Yantra).",
        "Designed and delivered 100+ interactive Power BI, Metabase & Looker Studio dashboards — Workshop/Funnel-to-Lead Conversion, Revenue Tracking, Occupancy Monitoring, Sales Productivity, Customer Journey Analysis, Process & Lead Gap Analysis, Software Access Control & E-commerce Analytics.",
        "Engineered n8n & Pabbly automation workflows for intelligent lead segregation by product/service, auto-reporting of untouched leads (15-day threshold) — reducing manual reporting effort by 20–30%.",
        "Deployed TeleCRM, CallerDesk & Smartflo for structured CRM lead assignment and call tracking — achieving a 40% improvement in sales executive productivity.",
        "Automated critical Google Sheets processes via Claude AI — lead bifurcation, conversion reporting, attendance management, leave tracking & event reminders, eliminating repetitive manual workflows.",
        "Developed customer segmentation models based on product affinity and service tier, enabling targeted lead nurturing and improved customer lifecycle management.",
        "Prepared and distributed daily, weekly, and monthly MIS reports to drive data-informed decision-making across management and operations teams.",
        "Managed payment tracking for premium product bookings, ensuring accurate financial reconciliation and real-time revenue reporting.",
        "Improved overall business process efficiency by 8–10% through structured SOP creation, process documentation, and cross-team operational guidance."
      ]
    },
    {
      title: "Data Analyst", company: "Innovate Insights Consultancy", location: "Noida, UP", client: "ONE97 Communications Ltd. (Paytm)",
      start: "Mar 2024", end: "Mar 2025",
      bullets: [
        "Managed large-scale data operations using SQL Server, Power BI, Excel, and Google Sheets, ensuring high data accuracy and minimizing discrepancies across financial datasets.",
        "Led financial reconciliation initiatives to maintain strict alignment between bank records and internal transaction data, reducing reporting error rates.",
        "Developed automated data ingestion pipelines via SFTP and Amazon S3, significantly reducing manual workload and data processing turnaround time.",
        "Designed and deployed analytical dashboards for enhanced transaction visibility, exception tracking, and operational reporting across business units."
      ]
    },
    {
      title: "Business Analyst", company: "Maral Overseas Ltd.", location: "Noida, UP", client: "",
      start: "Apr 2023", end: "Mar 2024",
      bullets: [
        "Conducted comprehensive stock and WIP (Work-in-Progress) analysis to optimize inventory management and streamline production workflows.",
        "Built Power BI dashboards delivering real-time operational and financial insights to senior leadership, enabling proactive decision-making.",
        "Analyzed sales trends using SQL to improve demand forecast accuracy and support strategic supply chain planning.",
        "Developed structured tracking reports for dispatch monitoring and payment follow-ups, improving operational transparency and reducing delays."
      ]
    },
    {
      title: "Branch Credit Manager", company: "IIFL Samasta", location: "Madhubani, BH", client: "",
      start: "Aug 2018", end: "Nov 2020",
      bullets: [
        "Managed financial data verification and compliance reporting, maintaining high accuracy standards across loan portfolios.",
        "Strengthened loan disbursement processes through rigorous credit risk assessment and structured underwriting protocols.",
        "Optimized collection strategies and follow-up workflows, improving repayment timelines and reducing portfolio delinquency rates."
      ]
    }
  ],
  skills: [
    { group: "BI & Analytics", items: ["Power BI", "Tableau", "Metabase", "Looker Studio", "Advanced Excel", "Google Sheets"] },
    { group: "Programming & Data", items: ["SQL", "Python", "SQL Server", "Amazon S3", "SSIS", "GitHub"] },
    { group: "Automation & AI", items: ["n8n", "Pabbly", "Claude AI", "ChatGPT", "Apps Script"] },
    { group: "CRM & Operations", items: ["TeleCRM", "CallerDesk", "Smartflo", "Lead Management", "Sales Operations", "SOP Documentation", "MIS Reporting"] }
  ],
  projects: [
    { name: "Customer Loan Analysis", tools: "SQL, Python, EDA", description: "Bank customer loan eligibility using EDA and statistical insights.", link: "https://github.com/RaviRanjanKumar-DA/Bank-Loan-of-Customers_AI-Varient", date: "Oct 2022" },
    { name: "Adventure Works Cycles", tools: "Tableau", description: "Sales and profitability analysis using Tableau to uncover trends.", link: "https://github.com/RaviRanjanKumar-DA/Adventure_Work_Cycle_Analysis", date: "Jan 2023" },
    { name: "Blinkit Sales Analysis", tools: "Power BI, EDA", description: "EDA on Blinkit data — customer behavior, sales patterns & delivery trends.", link: "https://github.com/RaviRanjanKumar-DA/Blinkit_Sales_Analysis", date: "Jan 2025" },
    { name: "Spotify Music Analysis", tools: "Power BI", description: "Music trends, popular genres & listening behavior on Power BI.", link: "https://github.com/RaviRanjanKumar-DA/Spotify_Sales_Analysis", date: "Feb 2025" },
    { name: "Mobile Sales Analysis", tools: "Power BI", description: "Dynamic Power BI dashboard for brand performance & regional demand.", link: "https://github.com/RaviRanjanKumar-DA/Mobile-Sales_Power-BI", date: "Apr 2025" },
    { name: "Blinkit SQL Analysis", tools: "SQL", description: "Advanced SQL to extract business insights from order and delivery datasets.", link: "https://github.com/RaviRanjanKumar-DA/Blinkit_SQL_Analysis", date: "" }
  ],
  education: [
    { degree: "Bachelor of Economics (Hons.)", institution: "Babasaheb Bhimrao Ambedkar Bihar University", location: "Muzaffarpur, Bihar", year: "2018" }
  ],
  certifications: [],
  achievements: [
    "40% sales productivity boost through TeleCRM & Smartflo deployment and structured lead management protocols.",
    "20–30% manual effort eliminated via n8n and Pabbly automation workflows.",
    "100+ interactive dashboards designed across Power BI, Metabase, Tableau & Looker Studio.",
    "8–10% process efficiency gain through structured SOP creation and process documentation."
  ]
};

export const profile = {
  name: cv.header.name,
  headline: "Data Analyst · 5+ Years · 100+ Dashboards · Power BI, SQL, CRM Automation",
  email: cv.header.email,
  phone: cv.header.phone,
  location: cv.header.location,
  linkedin: cv.header.linkedin,
  github: cv.header.github,
  portfolio: cv.header.portfolio,
  resume_link: RESUME,
  notice_period: "",
  current_ctc: "",
  expected_ctc: "",
  target_roles: "Senior Data Analyst, BI Analyst, Sales Operations Analyst, MIS Executive",
  signature: "Regards,\nRavi Ranjan Kumar\n+91 8851015209 · ravikumar.inbh@gmail.com\nLinkedIn: https://www.linkedin.com/in/ravi-ranjan-data-analyst/\nPortfolio: https://raviranjankumar-da.github.io/portfolio/"
};

export const templates = [
  { name: "Job application email", kind: "email", subject: "Application for {{role}} — Ravi Ranjan Kumar (5+ yrs, Power BI · SQL)",
    body: "Dear {{hiring_manager}},\n\nI am writing to apply for the {{role}} position at {{company}}. With 5+ years of professional experience (3+ years as a Data Analyst), I have designed 100+ interactive dashboards in Power BI, Metabase and Looker Studio and automated reporting with n8n, Pabbly and SQL — improving sales team productivity by 40%.\n\nI would welcome the chance to bring the same impact to {{company}}. My resume is here: {{resume_link}}\n\n{{signature}}" },
  { name: "LinkedIn connection note", kind: "linkedin_note", subject: "",
    body: "Hi {{hiring_manager}}, I saw the {{role}} opening at {{company}}. I'm a Data Analyst (5+ yrs, 100+ Power BI/Metabase dashboards, CRM automation). Would love to connect and learn more." },
  { name: "LinkedIn InMail to recruiter", kind: "linkedin_inmail", subject: "{{role}} at {{company}}",
    body: "Hi {{hiring_manager}},\n\nI came across the {{role}} role at {{company}} and believe my background fits well: 5+ years of experience, 100+ interactive dashboards (Power BI, Metabase, Looker Studio), SQL, and n8n/Pabbly automation that cut manual reporting effort by 20–30%.\n\nCould we have a quick chat this week? Resume: {{resume_link}}\n\nThanks,\nRavi" },
  { name: "Naukri recruiter message", kind: "naukri_message", subject: "Application — {{role}}",
    body: "Hello {{hiring_manager}},\n\nI have applied for the {{role}} position at {{company}}. Quick summary: 5+ years experience, Data Analyst (Power BI, SQL, Metabase, Looker Studio), CRM & workflow automation (n8n, Pabbly), 100+ dashboards delivered. Based in New Delhi, open to remote.\n\nResume: {{resume_link}}\nPhone: {{phone}}\n\nRegards,\nRavi Ranjan Kumar" },
  { name: "Follow-up after applying", kind: "follow_up", subject: "Following up — {{role}} application",
    body: "Dear {{hiring_manager}},\n\nI applied for the {{role}} role at {{company}} recently and wanted to follow up. I remain very interested and would be glad to share more about my dashboard and automation work.\n\n{{signature}}" },
  { name: "Thank-you after interview", kind: "thank_you", subject: "Thank you — {{role}} interview",
    body: "Dear {{interviewer}},\n\nThank you for taking the time to speak with me about the {{role}} role at {{company}}. I enjoyed learning about the team and I am excited about the opportunity to contribute.\n\n{{signature}}" },
  { name: "Cover letter", kind: "cover_letter", subject: "",
    body: "Dear {{hiring_manager}},\n\nI am excited to apply for the {{role}} position at {{company}}. Over 5+ years — including 3+ years as a dedicated Data Analyst — I have built 100+ interactive dashboards across Power BI, Metabase, Tableau and Looker Studio, deployed CRM systems that raised sales executive productivity by 40%, and engineered n8n & Pabbly workflows that reduced manual reporting effort by 20–30%.\n\nI would value the opportunity to discuss how I can help {{company}} make faster, data-driven decisions.\n\n{{signature}}" },
  { name: "Referral request", kind: "other", subject: "Referral request — {{role}} at {{company}}",
    body: "Hi {{hiring_manager}},\n\nI hope you're well. I noticed {{company}} is hiring for {{role}}. I'm a Data Analyst with 5+ years of experience (Power BI, SQL, CRM automation). Would you be open to referring me? Happy to share my resume: {{resume_link}}\n\nThank you!\nRavi" }
];

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const NOW = "2026-11-17T00:00:00.000Z";
let sql = "-- Generated by scripts/gen-seed.mjs — do not edit by hand\n";
sql += `INSERT INTO profile (id, json) VALUES (1, ${q(JSON.stringify(profile))});\n`;
sql += `INSERT INTO cv_master (id, json, updated_at) VALUES (1, ${q(JSON.stringify(cv))}, ${q(NOW)});\n`;
for (const t of templates)
  sql += `INSERT INTO templates (name, kind, subject, body, updated_at) VALUES (${q(t.name)}, ${q(t.kind)}, ${q(t.subject)}, ${q(t.body)}, ${q(NOW)});\n`;
sql += `INSERT INTO settings (key, value) VALUES ('ai_provider', 'openai'), ('ai_model', 'gpt-4o-mini');\n`;

if (process.argv[1] && process.argv[1].endsWith("gen-seed.mjs")) {
  writeFileSync("migrations/0002_seed.sql", sql);
  console.log("wrote migrations/0002_seed.sql");
}
