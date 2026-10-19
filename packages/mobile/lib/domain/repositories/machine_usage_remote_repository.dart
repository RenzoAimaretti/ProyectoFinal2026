/// Puerto remoto del uso de maquinaria ligado a tarea (push al backend).
///
/// El adaptador HTTP envía `{id, machineId, taskId, operatorId, usageHours,
/// hectares, workDate, observations}` con el UUID local, que el backend usa
/// para no duplicar horas al reintentar. Lanza las excepciones de sync ante
/// 401/4xx/5xx/red.
abstract class MachineUsageRemoteRepository {
  Future<void> push(
    Map<String, dynamic> payload, {
    required String token,
  });
}
