/**
 * Skill Taxonomy Dataset — grounded source of truth for offline extraction.
 * Mirrors backend/apps/catalog SEED (SKILLS) so frontend fallback matches
 * the server's deterministic matcher. Used when the AI gateway is unreachable.
 */
export interface TaxonomySkill {
  taxonomyId: string;
  name: string;
  category: string;
  /** Lower-case keywords / aliases that evidence this skill */
  keywords: string[];
}

export const SKILL_TAXONOMY: TaxonomySkill[] = [
  { taxonomyId: "TC-CM-01", name: "Communication", category: "Communication", keywords: ["communication", "public speaking", "presentation", "interpersonal", "collaboration", "teamwork", "negotiation", "counselling", "counseling"] },
  { taxonomyId: "TC-LS-01", name: "Leadership", category: "Management", keywords: ["leadership", "team lead", "mentoring", "coordinated", "organized", "managed a team", "supervised"] },
  { taxonomyId: "TC-PJ-01", name: "Project Management", category: "Management", keywords: ["project management", "agile", "scrum", "stakeholder", "planning", "scheduling", "coordination"] },
  { taxonomyId: "TC-PY-01", name: "Python", category: "Technical", keywords: ["python", "pandas", "numpy", "matplotlib", "jupyter", "pytorch", "scikit"] },
  { taxonomyId: "TC-ML-01", name: "Machine Learning", category: "Technical", keywords: ["machine learning", "ml", "deep learning", "neural network", "classification", "regression", "model training"] },
  { taxonomyId: "TC-RM-04", name: "Research Methodology", category: "Research", keywords: ["research methodology", "research design", "literature review", "hypothesis", "methodology", "systematic review"] },
  { taxonomyId: "TC-DA-02", name: "Data Analysis", category: "Technical", keywords: ["data analysis", "data analytics", "data visualization", "excel", "tableau", "power bi", "exploratory data"] },
  { taxonomyId: "TC-CR-03", name: "Clinical Research", category: "Domain", keywords: ["clinical research", "clinical trial", "gcp", "protocol", "case report", "informed consent"] },
  { taxonomyId: "TC-SW-02", name: "Scientific Writing", category: "Communication", keywords: ["scientific writing", "manuscript", "publication", "research paper", "citation", "plagiarism"] },
  { taxonomyId: "TC-DC-01", name: "Documentation", category: "Communication", keywords: ["documentation", "report writing", "sop", "record keeping", "minutes", "dpr"] },
  { taxonomyId: "TC-SA-01", name: "Statistical Analysis", category: "Technical", keywords: ["statistical analysis", "statistics", "biostatistics", "spss", " r ", "anova", "hypothesis testing", "p-value", "regression analysis"] },
  { taxonomyId: "TC-PV-02", name: "Pharmacovigilance", category: "Domain", keywords: ["pharmacovigilance", "adverse drug", "adr", "drug safety", "vigilance"] },
  { taxonomyId: "TC-DM-01", name: "Data Management", category: "Technical", keywords: ["data management", "database", "sql", "data entry", "data cleaning", "redcap"] },
  { taxonomyId: "TC-CT-05", name: "Clinical Trial Documentation", category: "Domain", keywords: ["clinical trial documentation", "case report form", "crf", "trial master file", "tmf"] },
  { taxonomyId: "TC-PH-01", name: "Pharmacology", category: "Domain", keywords: ["pharmacology", "pharmacokinetics", "pharmacodynamics", "drug action"] },
  { taxonomyId: "TC-AT-01", name: "Ayurvedic Therapeutics", category: "Domain", keywords: ["ayurveda", "ayurvedic", "panchakarma", "nadi pariksha", "dravyaguna", "kayachikitsa"] },
  { taxonomyId: "TC-PG-02", name: "Pharmacognosy", category: "Domain", keywords: ["pharmacognosy", "herbal drug", "phytochemistry", "herb identification", "medicinal plant"] },
  { taxonomyId: "TC-RS-01", name: "Research", category: "Research", keywords: ["research", "investigator", "ethics committee", "iec", "irb"] },
  { taxonomyId: "TC-PA-01", name: "Patient Assessment", category: "Domain", keywords: ["patient assessment", "clinical posting", "ward round", "history taking", "physical examination", "opd"] },
];

/** Quick lookup by lower-case name */
export const TAXONOMY_BY_NAME = new Map(SKILL_TAXONOMY.map((s) => [s.name.toLowerCase(), s]));
