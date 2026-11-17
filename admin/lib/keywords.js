// Dictionary of tools / skills used by the fact guard (invented tools) and the ATS check (JD keywords).
export const TOOLS = [
  "power bi", "tableau", "metabase", "looker studio", "looker", "qlik", "qlikview", "qlik sense", "excel", "advanced excel", "google sheets",
  "vba", "power query", "power pivot", "dax", "ssrs", "ssis", "ssas", "sql", "sql server", "mysql", "postgresql", "oracle", "mongodb",
  "snowflake", "bigquery", "redshift", "databricks", "spark", "pyspark", "hadoop", "hive", "airflow", "dbt", "kafka",
  "python", "pandas", "numpy", "matplotlib", "seaborn", "scikit-learn", "r", "sas", "spss", "stata", "matlab",
  "aws", "amazon s3", "azure", "gcp", "google cloud", "azure data factory", "alteryx", "knime", "informatica", "talend",
  "salesforce", "hubspot", "zoho", "zoho crm", "sap", "tally", "telecrm", "callerdesk", "smartflo", "freshworks",
  "n8n", "pabbly", "zapier", "make.com", "apps script", "claude ai", "chatgpt", "openai", "github", "git", "jira", "confluence",
  "google analytics", "ga4", "mixpanel", "amplitude", "sftp"
];

export const CONCEPTS = [
  "data analysis", "data analytics", "data visualization", "dashboards", "dashboard", "reporting", "mis", "mis reporting", "kpi", "kpis",
  "etl", "data modeling", "data modelling", "data cleaning", "data warehouse", "statistics", "statistical analysis", "forecasting",
  "a/b testing", "machine learning", "predictive modeling", "business intelligence", "crm", "lead management", "sales operations",
  "customer segmentation", "funnel analysis", "cohort analysis", "reconciliation", "automation", "workflow automation",
  "stakeholder management", "requirement gathering", "sop", "process improvement", "inventory", "supply chain", "e-commerce", "fintech"
];

export function termRegex(term) {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![a-z0-9])${t}(?![a-z0-9])`, "i");
}

export function findTerms(text, list) {
  const s = String(text || "");
  return list.filter((t) => termRegex(t).test(s));
}
