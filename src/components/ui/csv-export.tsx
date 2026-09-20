/**
 * Export data as CSV file download.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const NL = "\n";
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes(NL)) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        })
        .join(","),
    ),
  ].join(NL);

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Placement data → CSV rows
 */
export function placementsToCSV(placements: {
  department: string;
  students: number;
  placed: number;
  rate: number;
  avgStipend: number;
  topCompany: string;
}[]) {
  return exportToCSV(
    "placements-report.csv",
    ["Department", "Students", "Placed", "Rate %", "Avg Stipend (INR)", "Top Company"],
    placements.map((p) => [p.department, p.students, p.placed, p.rate, p.avgStipend, p.topCompany]),
  );
}

/**
 * Skills data → CSV rows
 */
export function skillsToCSV(skills: {
  name: string;
  totalStudents: number;
  verified: number;
  avgProficiency: number;
  industryDemand: string;
}[]) {
  return exportToCSV(
    "skills-report.csv",
    ["Skill", "Total Students", "Verified", "Avg Proficiency %", "Industry Demand"],
    skills.map((s) => [s.name, s.totalStudents, s.verified, s.avgProficiency, s.industryDemand]),
  );
}

/**
 * Department data → CSV rows
 */
export function departmentsToCSV(departments: {
  name: string;
  students: number;
  avgMatch: number;
  avgReadiness: number;
  placementRate: number;
  verifiedSkills: number;
  topGap: string;
}[]) {
  return exportToCSV(
    "departments-report.csv",
    ["Department", "Students", "Avg Match %", "Avg Readiness %", "Placement Rate %", "Verified Skills", "Top Gap"],
    departments.map((d) => [d.name, d.students, d.avgMatch, d.avgReadiness, d.placementRate, d.verifiedSkills, d.topGap]),
  );
}
