import { useState } from "react";
import type { OptionGroup } from "../../lib/registrationOptions";

const OTHER = "__other__";

/** Dropdown of known options plus "Other", which reveals a text box so any value can still be entered. */
export function SelectWithOther({
  id,
  value,
  onChange,
  groups,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  groups: OptionGroup[];
  className: string;
}) {
  const [other, setOther] = useState(false);
  const known = groups.some((g) => g.options.includes(value));
  const isOther = other || (value !== "" && !known);
  return (
    <div className="space-y-2">
      <select
        id={id}
        value={isOther ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
        className={className}
      >
        <option value="">Select (optional)</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER}>Other (type below)</option>
      </select>
      {isOther && (
        <input
          aria-label="Other value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type here"
          className={className}
        />
      )}
    </div>
  );
}
