import type { Locale } from "./locales";

// Teacher ↔ student collaboration strings. pt-BR is the source text; [pt-PT, en, es] per key.
const table: Record<string, [string, string, string]> = {
  "Voltar à agenda": ["Voltar à agenda", "Back to calendar", "Volver a la agenda"],
  "Área do professor": ["Área do professor", "Teacher area", "Área del profesor"],
  "Você vê somente as matérias que cada aluno escolheu compartilhar, e registra apenas a sua própria presença.": ["Vê apenas as disciplinas que cada aluno escolheu partilhar e regista apenas a sua própria presença.", "You only see the subjects each student chose to share, and you only record your own attendance.", "Solo ves las asignaturas que cada estudiante eligió compartir y registras únicamente tu propia asistencia."],
  "Convidar aluno": ["Convidar aluno", "Invite a student", "Invitar estudiante"],
  "O código vale 7 dias e só pode ser usado uma vez. Ele aparece apenas agora; envie ao aluno por um canal de confiança.": ["O código é válido durante 7 dias e só pode ser usado uma vez. Aparece apenas agora; envie-o ao aluno por um canal de confiança.", "The code is valid for 7 days and can be used once. It is shown only now; send it to the student through a channel you trust.", "El código vale 7 días y solo se puede usar una vez. Solo se muestra ahora; envíalo al estudiante por un canal de confianza."],
  "Código do convite": ["Código do convite", "Invite code", "Código de invitación"],
  "Gerar código de convite": ["Gerar código de convite", "Generate invite code", "Generar código de invitación"],
  "Convite pendente": ["Convite pendente", "Pending invite", "Invitación pendiente"],
  "expira em": ["expira a", "expires on", "caduca el"],
  "Cancelar convite": ["Cancelar convite", "Cancel invite", "Cancelar invitación"],
  "Convite cancelado.": ["Convite cancelado.", "Invite cancelled.", "Invitación cancelada."],
  "Alunos vinculados": ["Alunos associados", "Linked students", "Estudiantes vinculados"],
  "Encerrar vínculo": ["Terminar ligação", "End link", "Terminar vínculo"],
  "Vínculo encerrado.": ["Ligação terminada.", "Link ended.", "Vínculo terminado."],
  "Nenhum aluno vinculado ainda.": ["Ainda não há alunos associados.", "No linked students yet.", "Aún no hay estudiantes vinculados."],
  "Aulas compartilhadas (30 dias antes e depois)": ["Aulas partilhadas (30 dias antes e depois)", "Shared lessons (30 days before and after)", "Clases compartidas (30 días antes y después)"],
  "Registros diferentes": ["Registos diferentes", "Records differ", "Registros diferentes"],
  "Ainda não registrada": ["Ainda não registada", "Not recorded yet", "Aún sin registrar"],
  "Aluno registrou presença": ["O aluno registou presença", "Student recorded attendance", "El estudiante registró asistencia"],
  "Aluno registrou que faltou": ["O aluno registou que faltou", "Student recorded being absent", "El estudiante registró que faltó"],
  "Aluno relatou ausência do professor": ["O aluno relatou a ausência do professor", "Student reported the teacher absent", "El estudiante informó la ausencia del profesor"],
  "Minha presença em": ["A minha presença em", "My attendance for", "Mi asistencia en"],
  "Compareci": ["Estive presente", "I attended", "Asistí"],
  "Não compareci": ["Não estive presente", "I did not attend", "No asistí"],
  "Falta justificada": ["Falta justificada", "Excused absence", "Ausencia justificada"],
  "Registro salvo.": ["Registo guardado.", "Record saved.", "Registro guardado."],
  "Nenhuma aula compartilhada neste período.": ["Nenhuma aula partilhada neste período.", "No shared lessons in this period.", "No hay clases compartidas en este periodo."],
  "Meus professores": ["Os meus professores", "My teachers", "Mis profesores"],
  "Compartilhe matérias com um professor usando o código que ele gerar. Você pode encerrar o vínculo a qualquer momento.": ["Partilhe disciplinas com um professor usando o código que ele gerar. Pode terminar a ligação a qualquer momento.", "Share subjects with a teacher using the code they generate. You can end the link at any time.", "Comparte asignaturas con un profesor usando el código que genere. Puedes terminar el vínculo cuando quieras."],
  "Usar código de convite": ["Usar código de convite", "Use an invite code", "Usar código de invitación"],
  "Verificar código": ["Verificar código", "Check code", "Verificar código"],
  "quer acompanhar suas aulas.": ["quer acompanhar as suas aulas.", "wants to follow your lessons.", "quiere seguir tus clases."],
  "O professor verá, nas matérias escolhidas: datas, horários, conteúdo previsto, cancelamentos e o seu registro de presença. Conteúdo estudado e as outras matérias continuam privados.": ["Nas disciplinas escolhidas, o professor verá: datas, horários, conteúdo previsto, cancelamentos e o seu registo de presença. O conteúdo estudado e as outras disciplinas continuam privados.", "For the chosen subjects the teacher will see dates, times, planned content, cancellations and your attendance record. Studied content and other subjects stay private.", "En las asignaturas elegidas el profesor verá fechas, horarios, contenido previsto, cancelaciones y tu registro de asistencia. El contenido estudiado y las demás asignaturas siguen siendo privados."],
  "Matérias a compartilhar": ["Disciplinas a partilhar", "Subjects to share", "Asignaturas a compartir"],
  "Crie uma aula primeiro para ter matérias a compartilhar.": ["Crie primeiro uma aula para ter disciplinas a partilhar.", "Create a lesson first so you have subjects to share.", "Crea primero una clase para tener asignaturas que compartir."],
  "Recusar": ["Recusar", "Decline", "Rechazar"],
  "Aceitar e compartilhar": ["Aceitar e partilhar", "Accept and share", "Aceptar y compartir"],
  "Vínculo aceito. O professor passa a ver só as matérias escolhidas.": ["Ligação aceite. O professor passa a ver apenas as disciplinas escolhidas.", "Link accepted. The teacher now sees only the chosen subjects.", "Vínculo aceptado. El profesor solo verá las asignaturas elegidas."],
  "Vínculo encerrado. O professor deixou de ver suas aulas.": ["Ligação terminada. O professor deixou de ver as suas aulas.", "Link ended. The teacher can no longer see your lessons.", "Vínculo terminado. El profesor ya no ve tus clases."],
  "Vínculos ativos": ["Ligações ativas", "Active links", "Vínculos activos"],
  "Confirmar encerramento": ["Confirmar fim da ligação", "Confirm ending", "Confirmar fin del vínculo"],
  "Nenhum professor vinculado.": ["Nenhum professor associado.", "No linked teachers.", "Ningún profesor vinculado."],
  "Colaboração com professores": ["Colaboração com professores", "Teacher collaboration", "Colaboración con profesores"],
  "registrou:": ["registou:", "recorded:", "registró:"],
  "Compareceu": ["Compareceu", "Attended", "Asistió"],
  "Não compareceu": ["Não compareceu", "Did not attend", "No asistió"],
  "Código inválido ou expirado. Peça um novo código ao professor.": ["Código inválido ou expirado. Peça um novo código ao professor.", "Invalid or expired code. Ask the teacher for a new one.", "Código no válido o caducado. Pide un código nuevo al profesor."],
  "Escolha pelo menos uma matéria para compartilhar.": ["Escolha pelo menos uma disciplina para partilhar.", "Choose at least one subject to share.", "Elige al menos una asignatura para compartir."],
  "Esta aula já tem uma reposição. Exclua a reposição antes de reativar a original.": ["Esta aula já tem uma reposição. Elimine a reposição antes de reativar a original.", "This lesson already has a make-up. Delete the make-up before restoring the original.", "Esta clase ya tiene una recuperación. Elimina la recuperación antes de reactivar la original."],
  "Vínculo não encontrado.": ["Ligação não encontrada.", "Link not found.", "Vínculo no encontrado."],
};

const index: Record<Exclude<Locale, "pt-BR">, number> = { "pt-PT": 0, en: 1, es: 2 };

export function translateCollab(locale: Locale, text: string) {
  if (locale === "pt-BR") return undefined;
  return table[text]?.[index[locale]];
}
