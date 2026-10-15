import '../../domain/errors.dart';
import '../../domain/models/weather_reading.dart';
import '../../domain/repositories/session_repository.dart';
import '../../domain/repositories/weather_repository.dart';
import '../services/weather_api_service.dart';

/// Adaptador remoto del puerto [WeatherRepository] (design §2.12).
///
/// El puerto no expone el token en su firma, así que el adaptador lo lee de la
/// sesión local; cada lectura exitosa se persiste en el cache local
/// ([WeatherReadingStore]) para que la tarjeta pueda mostrarla sin señal.
class HttpWeatherRepository implements WeatherRepository {
  HttpWeatherRepository({
    required WeatherApiService apiService,
    required WeatherReadingStore cache,
    required SessionRepository sessionRepository,
  })  : _apiService = apiService,
        _cache = cache,
        _sessionRepository = sessionRepository;

  final WeatherApiService _apiService;
  final WeatherReadingStore _cache;
  final SessionRepository _sessionRepository;

  @override
  Future<WeatherReading?> lastReading() => _cache.read();

  @override
  Future<WeatherReading> fetchCurrent({
    required double lat,
    required double lon,
  }) async {
    final token = await _token();
    final reading =
        await _apiService.fetchCurrent(token: token, lat: lat, lon: lon);
    await _cache.save(reading);
    return reading;
  }

  @override
  Future<WeatherReading> fetchForLot({required String lotId}) async {
    final token = await _token();
    final reading = await _apiService.fetchForLot(token: token, lotId: lotId);
    await _cache.save(reading);
    return reading;
  }

  Future<String> _token() async {
    final session = await _sessionRepository.current();
    final token = session?.token;
    if (token == null || token.isEmpty) {
      throw const SyncUnauthorizedException('No hay una sesión activa');
    }
    return token;
  }
}
