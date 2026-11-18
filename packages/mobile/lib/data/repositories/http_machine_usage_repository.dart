import '../../domain/repositories/machine_usage_remote_repository.dart';
import '../services/machine_usage_api_service.dart';

/// Implementación HTTP del puerto [MachineUsageRemoteRepository].
class HttpMachineUsageRepository implements MachineUsageRemoteRepository {
  HttpMachineUsageRepository({MachineUsageApiService? apiService})
      : _apiService = apiService ?? MachineUsageApiService();

  final MachineUsageApiService _apiService;

  @override
  Future<void> push(
    Map<String, dynamic> payload, {
    required String token,
  }) {
    return _apiService.create(token: token, payload: payload);
  }
}
