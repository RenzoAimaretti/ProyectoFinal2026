import 'dart:convert';

import 'package:http/http.dart' as http;

const String kGanaderiaApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

class GanaderiaApi {
  GanaderiaApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<GanaderiaSnapshot> fetchDashboard() async {
    final responses = await Future.wait([
      _getList('/livestocks'),
      _getList('/farms'),
      _getList('/lots'),
      _getList('/weight-records'),
      _getList('/livestock-events'),
      _getList('/livestock-movements'),
      _getList('/users'),
    ]);

    return GanaderiaSnapshot(
      livestock: responses[0].map(LivestockAnimal.fromJson).toList(),
      farms: responses[1].map(FarmInfo.fromJson).toList(),
      lots: responses[2].map(LotInfo.fromJson).toList(),
      weights: responses[3].map(WeightRecordData.fromJson).toList(),
      events: responses[4].map(LivestockEventData.fromJson).toList(),
      movements: responses[5].map(LivestockMovementData.fromJson).toList(),
      users: responses[6].map(UserInfo.fromJson).toList(),
    );
  }

  Future<AnimalDetailData> fetchAnimalDetail(String livestockId) async {
    final dashboard = await fetchDashboard();
    final animal = dashboard.livestock.firstWhere((item) => item.id == livestockId);

    return AnimalDetailData(
      animal: animal,
      lotName: dashboard.lotById[animal.lotId]?.name ?? 'Sin lote',
      farmName: animal.lotId == null ? 'Sin dato' : dashboard.farmNameOf(dashboard.lotById[animal.lotId]?.farmId ?? ''),
      weights: dashboard.weights.where((item) => item.livestockId == livestockId).toList(),
      events: dashboard.events.where((item) => item.livestockId == livestockId).toList(),
      movements: dashboard.movements.where((item) => item.livestockId == livestockId).toList(),
      operatorNames: {for (final user in dashboard.users) user.id: user.username},
    );
  }

  Future<void> createWeightRecord({
    required String livestockId,
    required String operatorId,
    required double weight,
    required DateTime measuredAt,
  }) async {
    await _postJson('/weight-records', {
      'livestockId': livestockId,
      'operatorId': operatorId,
      'weight': weight,
      'measuredAt': measuredAt.toIso8601String(),
    });
  }

  Future<void> createLivestockEvent({
    required String livestockId,
    required String operatorId,
    required String eventType,
    required DateTime eventDate,
    String? observations,
    String? vaccine,
    double? dose,
  }) async {
    await _postJson('/livestock-events', {
      'livestockId': livestockId,
      'operatorId': operatorId,
      'eventType': eventType,
      'eventDate': eventDate.toIso8601String(),
      if (observations != null && observations.isNotEmpty) 'obs': observations,
      if (vaccine != null && vaccine.isNotEmpty) 'vaccine': vaccine,
      if (dose != null) 'dose': dose,
    });
  }

  Future<void> createLivestockMovement({
    required String livestockId,
    required String lotId,
    required DateTime movementDate,
    String? observations,
  }) async {
    await _postJson('/livestock-movements', {
      'livestockId': livestockId,
      'lotId': lotId,
      'movementDate': movementDate.toIso8601String(),
      if (observations != null && observations.isNotEmpty) 'observations': observations,
    });
  }

  Future<void> updateLivestockStatus({
    required String livestockId,
    required String status,
  }) async {
    await _putJson('/livestocks/$livestockId', {
      'status': status,
    });
  }

  void close() {
    _client.close();
  }

  Future<void> _postJson(String path, Map<String, dynamic> body) async {
    final response = await _client.post(
      Uri.parse('$kGanaderiaApiBaseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw GanaderiaApiException('POST $path failed with ${response.statusCode}');
    }
  }

  Future<void> _putJson(String path, Map<String, dynamic> body) async {
    final response = await _client.put(
      Uri.parse('$kGanaderiaApiBaseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw GanaderiaApiException('PUT $path failed with ${response.statusCode}');
    }
  }

  Future<List<Map<String, dynamic>>> _getList(String path) async {
    final response = await _client.get(Uri.parse('$kGanaderiaApiBaseUrl$path'));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw GanaderiaApiException('GET $path failed with ${response.statusCode}');
    }

    final decoded = jsonDecode(response.body);

    if (decoded is! List) {
      throw GanaderiaApiException('GET $path returned a non-list payload');
    }

    return decoded
        .whereType<Map>()
        .map((item) => item.map((key, value) => MapEntry(key.toString(), value)))
        .toList();
  }
}

class GanaderiaSnapshot {
  GanaderiaSnapshot({
    required this.livestock,
    required this.farms,
    required this.lots,
    required this.weights,
    required this.events,
    required this.movements,
    required this.users,
  })  : lotById = {for (final lot in lots) lot.id: lot},
        farmById = {for (final farm in farms) farm.id: farm};

  final List<LivestockAnimal> livestock;
  final List<FarmInfo> farms;
  final List<LotInfo> lots;
  final List<WeightRecordData> weights;
  final List<LivestockEventData> events;
  final List<LivestockMovementData> movements;
  final List<UserInfo> users;
  final Map<String, LotInfo> lotById;
  final Map<String, FarmInfo> farmById;

  int get totalLivestock => livestock.length;

  int get activeLivestock => livestock.where((item) => item.status == 'ACTIVO').length;

  int get sickLivestock => livestock.where((item) => item.status == 'ENFERMO').length;

  int get totalVacinations => events.where((item) => item.type == 'VACUNACION').length;

  int get totalMovements => movements.length;

  double get averageWeight {
    if (weights.isEmpty) {
      return 0;
    }

    final sum = weights.fold<double>(0, (previous, item) => previous + item.weight);
    return sum / weights.length;
  }

  int get activeOperators => users.where((item) => item.active).length;

  List<LivestockAnimal> get animalsSortedByCreatedAt {
    final items = [...livestock];
    items.sort((left, right) => (right.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0)).compareTo(left.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0)));
    return items;
  }

  List<LivestockAnimal> get activeAnimals => livestock.where((item) => item.status == 'ACTIVO').toList();

  List<LivestockAnimal> get sickAnimals => livestock.where((item) => item.status == 'ENFERMO').toList();

  List<WeightRecordData> get latestWeights {
    final items = [...weights];
    items.sort((left, right) => right.measuredAt.compareTo(left.measuredAt));
    return items.take(12).toList();
  }

  List<LivestockEventData> get latestEvents {
    final items = [...events];
    items.sort((left, right) => right.eventDate.compareTo(left.eventDate));
    return items.take(12).toList();
  }

  List<LivestockMovementData> get latestMovements {
    final items = [...movements];
    items.sort((left, right) => right.movementDate.compareTo(left.movementDate));
    return items.take(12).toList();
  }

  List<LivestockEventData> get vaccineEvents => events.where((item) => item.type == 'VACUNACION').toList();

  List<LivestockEventData> get reproductiveEvents => events.where((item) => const {'INSEMINACION', 'PARTO', 'CASTRACION'}.contains(item.type)).toList();

  Map<String, int> livestockStatusCounts() => _countBy(livestock, (item) => item.status);

  Map<String, int> eventTypeCounts() => _countBy(events, (item) => item.type);

  Map<String, int> movementCountsByLot() => _countBy(movements, (item) => lotLabelFor(item.lotId));

  List<WeightRecordData> weightsForAnimal(String livestockId) => weights.where((item) => item.livestockId == livestockId).toList();

  List<LivestockEventData> eventsForAnimal(String livestockId) => events.where((item) => item.livestockId == livestockId).toList();

  List<LivestockMovementData> movementsForAnimal(String livestockId) => movements.where((item) => item.livestockId == livestockId).toList();

  String lotLabelFor(String? lotId) {
    if (lotId == null) {
      return 'Sin lote';
    }

    return lotById[lotId]?.name ?? 'Lote no encontrado';
  }

  String farmNameOf(String farmId) {
    if (farmId.isEmpty) {
      return 'Sin dato';
    }

    return farmById[farmId]?.name ?? 'Campo no encontrado';
  }

  AnimalSnapshotCard cardFor(LivestockAnimal animal) {
    final animalWeights = weightsForAnimal(animal.id);
    animalWeights.sort((left, right) => right.measuredAt.compareTo(left.measuredAt));

    final animalEvents = eventsForAnimal(animal.id);
    animalEvents.sort((left, right) => right.eventDate.compareTo(left.eventDate));

    final animalMovements = movementsForAnimal(animal.id);
    animalMovements.sort((left, right) => right.movementDate.compareTo(left.movementDate));

    final latestWeight = animalWeights.isNotEmpty ? animalWeights.first : null;
    final previousWeight = animalWeights.length > 1 ? animalWeights[1] : null;
    final latestEvent = animalEvents.isNotEmpty ? animalEvents.first : null;
    final latestMovement = animalMovements.isNotEmpty ? animalMovements.first : null;

    return AnimalSnapshotCard(
      animal: animal,
      latestWeight: latestWeight,
      previousWeight: previousWeight,
      latestEvent: latestEvent,
      latestMovement: latestMovement,
      vaccinationCount: animalEvents.where((item) => item.type == 'VACUNACION').length,
      reproductiveCount: animalEvents.where((item) => const {'INSEMINACION', 'PARTO', 'CASTRACION'}.contains(item.type)).length,
      movementCount: animalMovements.length,
    );
  }

  List<AnimalSnapshotCard> animalCards() => animalsSortedByCreatedAt.map(cardFor).toList();

  List<DatePoint> weightTrendPoints() {
    final items = [...latestWeights.reversed];
    final limited = items.length > 8 ? items.sublist(items.length - 8) : items;

    return [
      for (final item in limited)
        DatePoint(
          label: _shortDate(item.measuredAt),
          value: item.weight,
        ),
    ];
  }

  static String _shortDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    return '$day/$month';
  }
}

class AnimalDetailData {
  AnimalDetailData({required this.animal, required this.lotName, required this.farmName, required this.weights, required this.events, required this.movements, required this.operatorNames});

  final LivestockAnimal animal;
  final String lotName;
  final String farmName;
  final List<WeightRecordData> weights;
  final List<LivestockEventData> events;
  final List<LivestockMovementData> movements;
  final Map<String, String> operatorNames;
}

class AnimalSnapshotCard {
  AnimalSnapshotCard({
    required this.animal,
    required this.latestWeight,
    required this.previousWeight,
    required this.latestEvent,
    required this.latestMovement,
    required this.vaccinationCount,
    required this.reproductiveCount,
    required this.movementCount,
  });

  final LivestockAnimal animal;
  final WeightRecordData? latestWeight;
  final WeightRecordData? previousWeight;
  final LivestockEventData? latestEvent;
  final LivestockMovementData? latestMovement;
  final int vaccinationCount;
  final int reproductiveCount;
  final int movementCount;
}

class LivestockAnimal {
  LivestockAnimal({
    required this.id,
    required this.companyId,
    required this.tagNumber,
    required this.species,
    required this.sex,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.lotId,
    required this.breed,
    required this.birthDate,
    required this.entryDate,
  });

  factory LivestockAnimal.fromJson(Map<String, dynamic> json) {
    return LivestockAnimal(
      id: json['id']?.toString() ?? '',
      companyId: json['companyId']?.toString() ?? '',
      tagNumber: json['tagNumber']?.toString() ?? '',
      species: json['species']?.toString() ?? '',
      sex: json['sex']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVO',
      createdAt: _toDateTime(json['createdAt']),
      updatedAt: _toDateTime(json['updatedAt']),
      lotId: json['lotId']?.toString(),
      breed: json['breed']?.toString(),
      birthDate: _toDateTime(json['birthDate']),
      entryDate: _toDateTime(json['entryDate']),
    );
  }

  final String id;
  final String companyId;
  final String tagNumber;
  final String species;
  final String sex;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? lotId;
  final String? breed;
  final DateTime? birthDate;
  final DateTime? entryDate;
}

class LotInfo {
  LotInfo({required this.id, required this.name, required this.farmId, required this.area, required this.active});

  factory LotInfo.fromJson(Map<String, dynamic> json) {
    return LotInfo(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      farmId: json['farmId']?.toString() ?? '',
      area: _toDouble(json['area']),
      active: json['active'] as bool? ?? true,
    );
  }

  final String id;
  final String name;
  final String farmId;
  final double area;
  final bool active;
}

class FarmInfo {
  FarmInfo({required this.id, required this.companyId, required this.name, required this.location, required this.surface});

  factory FarmInfo.fromJson(Map<String, dynamic> json) {
    return FarmInfo(
      id: json['id']?.toString() ?? '',
      companyId: json['companyId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      location: json['location']?.toString(),
      surface: _toDouble(json['surface']),
    );
  }

  final String id;
  final String companyId;
  final String name;
  final String? location;
  final double surface;
}

class WeightRecordData {
  WeightRecordData({required this.id, required this.livestockId, required this.operatorId, required this.weight, required this.measuredAt});

  factory WeightRecordData.fromJson(Map<String, dynamic> json) {
    return WeightRecordData(
      id: json['id']?.toString() ?? '',
      livestockId: json['livestockId']?.toString() ?? '',
      operatorId: json['operatorId']?.toString(),
      weight: _toDouble(json['weight']),
      measuredAt: _toDateTime(json['measuredAt']) ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final String livestockId;
  final String? operatorId;
  final double weight;
  final DateTime measuredAt;
}

class LivestockEventData {
  LivestockEventData({
    required this.id,
    required this.livestockId,
    required this.operatorId,
    required this.type,
    required this.observations,
    required this.vaccine,
    required this.dose,
    required this.eventDate,
  });

  factory LivestockEventData.fromJson(Map<String, dynamic> json) {
    return LivestockEventData(
      id: json['id']?.toString() ?? '',
      livestockId: json['livestockId']?.toString() ?? '',
      operatorId: json['operatorId']?.toString(),
      type: json['type']?.toString() ?? '',
      observations: json['observations']?.toString(),
      vaccine: json['vaccine']?.toString(),
      dose: json['dose'] == null ? null : _toDouble(json['dose']),
      eventDate: _toDateTime(json['eventDate']) ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final String livestockId;
  final String? operatorId;
  final String type;
  final String? observations;
  final String? vaccine;
  final double? dose;
  final DateTime eventDate;
}

class LivestockMovementData {
  LivestockMovementData({required this.id, required this.livestockId, required this.lotId, required this.movementDate, required this.observations});

  factory LivestockMovementData.fromJson(Map<String, dynamic> json) {
    return LivestockMovementData(
      id: json['id']?.toString() ?? '',
      livestockId: json['livestockId']?.toString() ?? '',
      lotId: json['lotId']?.toString() ?? '',
      movementDate: _toDateTime(json['movementDate']) ?? DateTime.fromMillisecondsSinceEpoch(0),
      observations: json['observations']?.toString(),
    );
  }

  final String id;
  final String livestockId;
  final String lotId;
  final DateTime movementDate;
  final String? observations;
}

class UserInfo {
  UserInfo({required this.id, required this.username, required this.role, required this.active, required this.companyId});

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      active: json['active'] as bool? ?? true,
      companyId: json['companyId']?.toString() ?? '',
    );
  }

  final String id;
  final String username;
  final String role;
  final bool active;
  final String companyId;
}

class DatePoint {
  DatePoint({required this.label, required this.value});

  final String label;
  final double value;
}

class GanaderiaApiException implements Exception {
  GanaderiaApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

Map<String, int> _countBy<T>(Iterable<T> items, String Function(T item) keyOf) {
  final counts = <String, int>{};

  for (final item in items) {
    final key = keyOf(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

DateTime? _toDateTime(dynamic value) {
  if (value == null) {
    return null;
  }

  if (value is DateTime) {
    return value;
  }

  return DateTime.tryParse(value.toString());
}

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '') ?? 0;
}