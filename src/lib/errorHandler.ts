/**
 * Maps raw database/API errors to safe, user-friendly messages.
 * Prevents leaking schema details in production.
 */
export const mapErrorToUserMessage = (error: unknown): string => {
  const message = (error as any)?.message || "";

  if (message.includes("duplicate key")) return "Este item já existe.";
  if (message.includes("foreign key")) return "Não é possível excluir este item pois está em uso.";
  if (message.includes("violates check constraint")) return "Dados inválidos fornecidos.";
  if (message.includes("permission denied")) return "Você não tem permissão para esta ação.";
  if (message.includes("already registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("Email not confirmed")) return "Verifique seu e-mail para confirmar a conta.";
  if (message.includes("not found")) return "Item não encontrado.";
  if (message.includes("network")) return "Erro de conexão. Verifique sua internet.";

  return "Ocorreu um erro. Tente novamente.";
};
