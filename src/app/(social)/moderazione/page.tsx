import { requireAdmin } from "@/server/authorization/session";
import { listOpenReports } from "@/features/reports/queries";
import { REPORT_REASON_LABEL } from "@/features/reports/schemas";
import {
  resolveReportAction,
  moderationDeletePostAction,
  moderationSuspendUserAction,
} from "@/features/reports/actions";

export const metadata = { title: "Moderazione" };

export default async function ModerationPage() {
  await requireAdmin();
  const reports = await listOpenReports();
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">MODERAZIONE</p>
          <h1>Segnalazioni in attesa.</h1>
          <p className="muted">
            {reports.length === 0
              ? "Nessuna segnalazione aperta."
              : `${reports.length} segnalazion${reports.length === 1 ? "e" : "i"} da rivedere.`}
          </p>
        </div>
      </div>
      <div className="stack">
        {reports.map((report) => (
          <article key={report.id} className="card card-body stack">
            <div className="button-row" style={{ justifyContent: "space-between" }}>
              <span>
                <strong>{REPORT_REASON_LABEL[report.reason] ?? report.reason}</strong>{" "}
                <span className="muted">
                  segnalata da @{report.reporterUsername} ·{" "}
                  {new Intl.DateTimeFormat("it-IT", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(report.createdAt)}
                </span>
              </span>
            </div>
            {report.detail && <p>{report.detail}</p>}
            {report.post && (
              <div className="card card-body">
                <p className="muted">
                  Post di @{report.post.authorUsername} ({report.post.authorName})
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{report.post.body}</p>
              </div>
            )}
            {report.reportedUser && (
              <p className="muted">
                Profilo di {report.reportedUser.name} (@{report.reportedUser.username})
              </p>
            )}
            <div className="button-row">
              <form action={resolveReportAction}>
                <input type="hidden" name="reportId" value={report.id} />
                <button className="button" type="submit">
                  Segna come risolta
                </button>
              </form>
              {report.post && (
                <form action={moderationDeletePostAction}>
                  <input type="hidden" name="postId" value={report.post.id} />
                  <button className="button button-danger" type="submit">
                    Elimina post
                  </button>
                </form>
              )}
              {report.reportedUser && (
                <form action={moderationSuspendUserAction}>
                  <input type="hidden" name="userId" value={report.reportedUser.id} />
                  <button className="button button-danger" type="submit">
                    Sospendi utente
                  </button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
