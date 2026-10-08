import { useEffect, useState } from "react";
import { School as SchoolIcon } from "lucide-react";
import { env } from "../../config/env";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import {
  getSelectedSessionRaw,
  parseSelectedSession,
  setStoredSelectedSession,
} from "../../lib/selectedSession";
import { superAdminService } from "../../services/superadmin.service";
import type { AuthSchool } from "../../types/auth.types";
import type { Session } from "../../types/superadmin.types";

/** School logo files are served from <apiBaseUrl>/uploads/schoollogo/<file>. */
function logoUrl(file?: string): string | null {
  return file ? `${env.apiBaseUrl}/uploads/schoollogo/${encodeURIComponent(file)}` : null;
}

/**
 * Header info for a school admin: their school (from the login response) and
 * a session picker. Admins have no workspace switcher, so this is where the
 * session is chosen; the school is fixed to the admin's own school.
 */
export function AdminWorkspaceBar({ school }: { school: AuthSchool }) {
  const { selectedSession, selectSession } = useSelectedSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [failed, setFailed] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    superAdminService
      .getSessions()
      .then((res) => {
        if (cancelled) return;
        const list = res.sessions ?? [];
        setSessions(list);
        // First visit: use the newest session so the pages work straight away.
        if (list.length > 0 && !parseSelectedSession(getSelectedSessionRaw())) {
          const newest = [...list].sort((a, b) =>
            String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
          )[0];
          setStoredSelectedSession({ id: newest._id, name: newest.session });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logo = logoBroken ? null : logoUrl(school.schoolLogo);

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-white py-1 pl-1.5 pr-3 text-xs">
      {logo ? (
        <img
          src={logo}
          alt=""
          onError={() => setLogoBroken(true)}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <SchoolIcon size={14} className="ml-1 shrink-0 text-marigold-dark" />
      )}
      <span className="max-w-[9rem] truncate font-medium text-ink sm:max-w-xs">{school.schoolName}</span>
      <span className="h-3 w-px shrink-0 bg-line" />
      {failed ? (
        <span className="shrink-0 text-ink-soft">Sessions unavailable</span>
      ) : (
        <select
          aria-label="Session"
          value={selectedSession?.id ?? ""}
          onChange={(e) => {
            const chosen = sessions.find((s) => s._id === e.target.value);
            if (chosen) selectSession({ id: chosen._id, name: chosen.session });
          }}
          className="shrink-0 bg-transparent font-medium text-ink focus:outline-none"
        >
          {!selectedSession && <option value="">Session</option>}
          {/* Keep the saved session visible even before the list has loaded. */}
          {selectedSession && !sessions.some((s) => s._id === selectedSession.id) && (
            <option value={selectedSession.id}>{selectedSession.name}</option>
          )}
          {sessions.map((s) => (
            <option key={s._id} value={s._id}>
              {s.session}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
