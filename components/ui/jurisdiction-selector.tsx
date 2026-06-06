"use client";

import { useEffect, useState } from "react";
import { JURISDICTIONS, type Jurisdiction } from "@/lib/utils/jurisdictions";

interface OrgJurisdiction {
  jurisdiction_code: string;
  status: string;
}

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export function JurisdictionSelector({ value, onChange }: Props) {
  const [active, setActive] = useState<OrgJurisdiction[]>([]);

  useEffect(() => {
    fetch("/api/jurisdiction/list")
      .then((r) => r.json())
      .then((d) => {
        const list: OrgJurisdiction[] = d.jurisdictions ?? [];
        setActive(list);
        // Set default to first active code if current value is not in active list
        if (list.length && !list.some((j) => j.jurisdiction_code === value)) {
          onChange(list[0].jurisdiction_code);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCodes = new Set(active.map((j) => j.jurisdiction_code));
  const options = JURISDICTIONS.filter((j) => activeCodes.has(j.code));

  if (!options.length) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-400 whitespace-nowrap">Jurisdiction</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-700 border border-slate-600 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map((j) => (
          <option key={j.code} value={j.code}>
            {j.flag} {j.name}
          </option>
        ))}
      </select>
    </div>
  );
}
