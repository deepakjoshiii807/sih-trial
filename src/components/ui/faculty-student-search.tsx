import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";

interface Student {
  name: string;
  initials: string;
  skills: string[];
  readiness: string;
  department?: string;
}

interface Props {
  students: Student[];
  onFilter: (filtered: Student[]) => void;
}

export default function StudentSearch({ students, onFilter }: Props) {
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const allSkills = useMemo(() => {
    const skillSet = new Set<string>();
    students.forEach((s) => s.skills.forEach((sk) => skillSet.add(sk)));
    return Array.from(skillSet).sort();
  }, [students]);

  const filtered = useMemo(() => {
    let result = students;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.initials.toLowerCase().includes(q));
    }
    if (skillFilter) {
      result = result.filter((s) => s.skills.includes(skillFilter));
    }
    if (readinessFilter) {
      result = result.filter((s) => s.readiness === readinessFilter);
    }
    return result;
  }, [students, query, skillFilter, readinessFilter]);

  // Notify parent when filters change
  useMemo(() => {
    onFilter(filtered);
  }, [filtered]);

  const hasFilters = query || skillFilter || readinessFilter;

  return (
    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "#E6E3D7", background: "#fff" }}>
          <Search size={14} style={{ color: "#9A9D94" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "#171A18" }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-0.5 rounded hover:bg-gray-100">
              <X size={12} style={{ color: "#9A9D94" }} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${showFilters ? "text-white" : "border"}`}
          style={showFilters ? { background: "#244B35" } : { borderColor: "#E6E3D7", color: "#6B6F68" }}
        >
          <Filter size={13} /> Filters
          {hasFilters && (
            <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center" style={{ background: "#E8C7AE", color: "#7a3f1a" }}>
              {[query, skillFilter, readinessFilter].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3 mt-3 pt-3 border-t" style={{ borderColor: "#E6E3D7" }}>
          <div className="flex-1">
            <label className="text-[10px] font-bold tracking-wider uppercase mb-1 block" style={{ color: "#6B6F68" }}>Skill</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "#E6E3D7" }}
            >
              <option value="">All skills</option>
              {allSkills.map((sk) => <option key={sk} value={sk}>{sk}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold tracking-wider uppercase mb-1 block" style={{ color: "#6B6F68" }}>Readiness</label>
            <select
              value={readinessFilter}
              onChange={(e) => setReadinessFilter(e.target.value)}
              className="w-full rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "#E6E3D7" }}
            >
              <option value="">All levels</option>
              <option value="Job-Ready">Job-Ready</option>
              <option value="Developing">Developing</option>
              <option value="Beginning">Beginning</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setQuery(""); setSkillFilter(""); setReadinessFilter(""); }}
              className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-white transition-all"
              style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="mt-2 text-[11px]" style={{ color: "#9A9D94" }}>
          Showing {filtered.length} of {students.length} students
        </div>
      )}
    </div>
  );
}
