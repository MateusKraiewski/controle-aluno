import { headers } from "next/headers";
import { toCsv } from "@/features/learning/csv";
import { listHistoryForExport } from "@/features/learning/repository";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Downloads the signed-in student's own history as CSV; private notes only with ?notas=1. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Entre na sua conta para exportar.", { status: 401 });
  const withNotes = new URL(request.url).searchParams.get("notas") === "1";
  const rows = await listHistoryForExport(session.user.id);
  const header = ["data", "inicio", "fim", "materia", "estado", "presenca_relatada_pelo_aluno", "conteudo_previsto", "conteudo_estudado", "proximo_passo", "motivo_cancelamento", ...(withNotes ? ["nota_privada"] : [])];
  const body = toCsv(header, rows.map((row) => [
    row.date, row.startsAt.slice(0, 5), row.endsAt.slice(0, 5), row.subject, row.status, row.attendance, row.plannedContent,
    row.studiedContent, row.nextStep, row.cancellationReason, ...(withNotes ? [row.privateNote] : []),
  ]));
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aula-em-dia-historico.csv"`,
      "cache-control": "no-store",
    },
  });
}
