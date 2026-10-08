"use client";
import { useState } from "react";
import { evaluateCompatibility } from "@/lib/compatibility";
export default function CompatibilityPanel({
  spec,
}: {
  spec: Record<string, string>;
}) {
  const [cpu, setCpu] = useState("AM5");
  const [ram, setRam] = useState("DDR5");
  return (
    <section className="compatibility">
      <h3>Check your components</h3>
      <p>Start with the connections that matter.</p>
      <label>
        CPU socket
        <select value={cpu} onChange={(e) => setCpu(e.target.value)}>
          <option>AM5</option>
          <option>AM4</option>
          <option>LGA1700</option>
          <option>LGA1851</option>
        </select>
      </label>
      <label>
        Memory type
        <select value={ram} onChange={(e) => setRam(e.target.value)}>
          <option>DDR5</option>
          <option>DDR4</option>
        </select>
      </label>
      <div aria-live="polite">
        {evaluateCompatibility(spec, cpu, ram).map((r, i) => (
          <div key={i} className={"result " + r.status}>
            <b>
              {r.status === "compatible"
                ? "✓ Compatible"
                : r.status === "warning"
                  ? "! Check before building"
                  : "× Not compatible"}
            </b>
            <p>{r.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
